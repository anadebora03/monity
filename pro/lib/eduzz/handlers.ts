import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveEduzzProduct } from './products';
import { findOrInviteBuyer } from './user';
import { mapEduzzContractStatus } from './status';
import type { EduzzContractEventData, EduzzInvoicePaidEventData, EduzzCardAttemptedEventData } from './types';

export type HandlerResult = { status: 'processed' | 'ignored'; note?: string };

async function getEduzzProviderId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.from('payment_providers').select('id').eq('slug', 'eduzz').maybeSingle();
  if (error || !data) throw new Error('payment_providers "eduzz" não encontrado — schema_pro_032.sql rodou?');
  return data.id;
}

async function findOrCreateWorkspace(supabase: SupabaseClient, ownerId: string, nomeComprador: string, planId: string): Promise<string> {
  const { data: existing } = await supabase.from('workspaces').select('id').eq('owner_id', ownerId).maybeSingle();
  if (existing) return existing.id;

  // Mesma forma de nome usada em completeOnboarding() (onboarding/actions.ts)
  // — quando a pessoa completar o onboarding depois, o workspace já existe
  // (com o plano da compra) e completeOnboarding() não sobrescreve nada.
  const { data: created, error } = await supabase
    .from('workspaces')
    .insert({ owner_id: ownerId, nome: `Consultório de ${nomeComprador}`, plan_id: planId, status: 'active' })
    .select('id')
    .single();
  if (error || !created) throw new Error(`Falha ao criar workspace: ${error?.message}`);
  return created.id;
}

async function upsertSubscriptionByProviderRef(supabase: SupabaseClient, providerSubscriptionId: string, fields: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('provider_subscription_id', providerSubscriptionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('subscriptions').update(fields).eq('id', existing.id);
    if (error) throw new Error(`Falha ao atualizar subscription: ${error.message}`);
  } else {
    const { error } = await supabase.from('subscriptions').insert({ ...fields, provider_subscription_id: providerSubscriptionId });
    if (error) throw new Error(`Falha ao criar subscription: ${error.message}`);
  }
}

/* contract_created e contract_updated compartilham o mesmo formato de
   payload (confirmado nos dois exemplos da documentação) — um handler
   só, idempotente via upsert por provider_subscription_id (= data.contract.id).
   Cobre os dois eventos e qualquer ordem de chegada (ex.: um retry
   entrega contract_updated antes de contract_created). */
export async function handleContractEvent(supabase: SupabaseClient, data: EduzzContractEventData): Promise<HandlerResult> {
  const productRef = data.products[0];
  if (!productRef) return { status: 'ignored', note: 'payload sem products[0]' };

  const product = await resolveEduzzProduct(supabase, productRef.id);
  if (!product) return { status: 'ignored', note: `produto Eduzz não mapeado: ${productRef.id}` };

  const providerId = await getEduzzProviderId(supabase);
  const status = mapEduzzContractStatus(data.contract.status);
  const valorCents = Math.round((data.contract.recurrence?.price.value ?? productRef.price.value) * 100);

  const base = {
    subscription_product_id: product.id,
    provider_id: providerId,
    product_type: product.product_type,
    status,
    valor_cents: valorCents,
    started_at: data.contract.createdAt,
    current_period_end: data.contract.recurrence?.nextDue || null,
    canceled_at: status === 'canceled' ? data.contract.updatedAt : null,
    external_customer_id: null as string | null,
  };

  const buyerId = await findOrInviteBuyer(supabase, data.customer.email, data.customer.name);

  if (product.product_type === 'professional') {
    if (!product.plan_id) throw new Error(`subscription_products ${product.id} é professional sem plan_id`);
    const workspaceId = await findOrCreateWorkspace(supabase, buyerId, data.customer.name, product.plan_id);

    await upsertSubscriptionByProviderRef(supabase, data.contract.id, {
      ...base,
      plan_id: product.plan_id,
      workspace_id: workspaceId,
      user_id: null,
    });

    // workspaces.plan_id é o que Assinatura/StatsGrid leem hoje pra
    // limite/preço — mantém sincronizado só quando a assinatura está
    // de fato utilizável (não regride o plano num past_due passageiro).
    if (status === 'active' || status === 'trialing') {
      await supabase.from('workspaces').update({ plan_id: product.plan_id, status: 'active' }).eq('id', workspaceId);
    }
  } else {
    await upsertSubscriptionByProviderRef(supabase, data.contract.id, {
      ...base,
      plan_id: null,
      workspace_id: null,
      user_id: buyerId,
    });
  }

  return { status: 'processed' };
}

/* invoice_paid = renovação confirmada. Não traz nextDue (isso só vem
   em contract_updated), então current_period_end não é atualizado
   aqui — fica como limitação conhecida até confirmar se a Eduzz
   sempre manda um contract_updated junto de cada renovação. */
export async function handleInvoicePaid(supabase: SupabaseClient, data: EduzzInvoicePaidEventData): Promise<HandlerResult> {
  const { data: sub } = await supabase.from('subscriptions').select('id').eq('provider_subscription_id', data.contract.id).maybeSingle();
  if (!sub) return { status: 'ignored', note: `invoice_paid sem subscription conhecida (contract ${data.contract.id})` };

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'active', ultimo_pagamento_em: data.paidAt, valor_cents: Math.round(data.paid.value * 100) })
    .eq('id', sub.id);
  if (error) throw new Error(`Falha ao registrar pagamento: ${error.message}`);

  return { status: 'processed' };
}

/* contract_card_attempted dispara pra tentativa com sucesso OU falha
   (data.invoice.status/failReason distinguem) — só nos interessa a
   falha; sucesso já é coberto por invoice_paid. */
export async function handleCardAttempted(supabase: SupabaseClient, data: EduzzCardAttemptedEventData): Promise<HandlerResult> {
  const failed = data.invoice.status !== 'paid' || !!data.invoice.failReason;
  if (!failed) return { status: 'ignored', note: 'tentativa de cobrança bem-sucedida — invoice_paid já cobre isso' };

  const { data: sub } = await supabase.from('subscriptions').select('id').eq('provider_subscription_id', data.contract.id).maybeSingle();
  if (!sub) return { status: 'ignored', note: `card_attempted sem subscription conhecida (contract ${data.contract.id})` };

  const { error } = await supabase.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id);
  if (error) throw new Error(`Falha ao marcar past_due: ${error.message}`);

  return { status: 'processed' };
}

/* Escopo v1 (Sprint Integração Eduzz): os 4 eventos confirmados na
   documentação oficial. Qualquer evento fora daqui (ex.:
   invoice_canceled/invoice_expired/invoice_waiting_refund, ou algo
   novo que a Eduzz vier a mandar) é reconhecido e logado
   (eduzz_webhook_events fica com status 'ignored'), nunca quebra o
   webhook nem altera assinatura — pronto pra ganhar handler próprio
   quando o payload real desses eventos for consultado. */
export async function processEduzzEvent(supabase: SupabaseClient, eventName: string, data: unknown): Promise<HandlerResult> {
  switch (eventName) {
    case 'myeduzz.contract_created':
    case 'myeduzz.contract_updated':
      return handleContractEvent(supabase, data as EduzzContractEventData);
    case 'myeduzz.invoice_paid':
      return handleInvoicePaid(supabase, data as EduzzInvoicePaidEventData);
    case 'myeduzz.contract_card_attempted':
      return handleCardAttempted(supabase, data as EduzzCardAttemptedEventData);
    default:
      return { status: 'ignored', note: `evento sem handler no v1: ${eventName}` };
  }
}
