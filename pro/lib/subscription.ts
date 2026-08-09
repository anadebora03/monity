import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plan, Subscription } from './types';

export type PlanoCatalogo = Pick<
  Plan,
  'id' | 'slug' | 'nome' | 'patient_limit' | 'price_cents' | 'included_seats' | 'periodo' | 'features' | 'destaque'
>;

export type UsoPlano = {
  limite: number | null; // null = ilimitado
  usados: number;
  disponiveis: number | null; // null = ilimitado
  percentual: number | null; // null quando ilimitado (sem sentido mostrar barra)
};

export type AssinaturaData = {
  planoAtual: PlanoCatalogo | null;
  workspaceStatus: string; // 'active' | 'inactive' | 'suspended' (workspaces.status)
  uso: UsoPlano;
  subscription: Pick<
    Subscription,
    'status' | 'valor_cents' | 'current_period_end' | 'ultimo_pagamento_em' | 'canceled_at' | 'cancel_reason'
  > | null;
  planoSolicitado: { nome: string; solicitadoEm: string } | null;
  catalogo: PlanoCatalogo[];
};

const PLANO_SELECT = 'id, slug, nome, patient_limit, price_cents, included_seats, periodo, features, destaque';

/* Camada de dados da Assinatura. Três fontes, cada uma clara sobre o
   que representa (item 20 do brief — frontend nunca é autoridade):
   - workspaces + plans: identidade do plano e limite, sempre reais e
     disponíveis (existem desde o cadastro do workspace).
   - workspace_patient_usage: uso ao vivo, mesma view já usada no
     Dashboard.
   - subscriptions: dado de cobrança (status/valor/próxima cobrança).
     A tabela nasce vazia (schema_pro_025.sql) e só é preenchida
     manualmente pelo admin ou por integração futura — um workspace
     sem nenhuma linha aqui é o caso normal hoje, não um erro; a UI
     trata isso como "informação de cobrança ainda não disponível",
     nunca inventa um valor. */
export async function getAssinaturaData(supabase: SupabaseClient, ownerId: string): Promise<AssinaturaData> {
  // "plans!plan_id" desambigua o embed: workspaces agora tem DUAS FKs
  // pra plans (plan_id e requested_plan_id, esta última nova nesta
  // sprint), então "plans (...)" sozinho fica ambíguo pro PostgREST.
  const [{ data: workspace }, { data: usage }, { data: catalogo }] = await Promise.all([
    supabase
      .from('workspaces')
      .select(`id, status, plan_id, requested_plan_id, requested_plan_at, plans!plan_id ( ${PLANO_SELECT} )`)
      .eq('owner_id', ownerId)
      .maybeSingle(),
    supabase.from('workspace_patient_usage').select('patient_limit, patients_used, patients_available').eq('owner_id', ownerId).maybeSingle(),
    supabase.from('plans').select(PLANO_SELECT).eq('status', 'active').order('price_cents', { ascending: true, nullsFirst: false }),
  ]);

  const planoAtual = (workspace?.plans as unknown as PlanoCatalogo | null) ?? null;

  let planoSolicitado: AssinaturaData['planoSolicitado'] = null;
  if (workspace?.requested_plan_id && workspace.requested_plan_at) {
    const { data: pedido } = await supabase.from('plans').select('nome').eq('id', workspace.requested_plan_id).maybeSingle();
    if (pedido) planoSolicitado = { nome: pedido.nome, solicitadoEm: workspace.requested_plan_at };
  }

  let subscriptionRow: AssinaturaData['subscription'] = null;
  if (workspace?.id) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, valor_cents, current_period_end, ultimo_pagamento_em, canceled_at, cancel_reason')
      .eq('workspace_id', workspace.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    subscriptionRow = sub ?? null;
  }

  const limite = usage?.patient_limit ?? planoAtual?.patient_limit ?? null;
  const usados = usage?.patients_used ?? 0;
  const disponiveis = usage?.patients_available ?? (limite == null ? null : Math.max(limite - usados, 0));
  const percentual = limite == null ? null : Math.min(Math.round((usados / limite) * 100), 100);

  return {
    planoAtual,
    workspaceStatus: workspace?.status ?? 'active',
    uso: { limite, usados, disponiveis, percentual },
    subscription: subscriptionRow,
    planoSolicitado,
    catalogo: (catalogo ?? []) as PlanoCatalogo[],
  };
}
