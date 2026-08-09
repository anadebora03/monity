'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/* Mesmo padrão de pro/app/pro/configuracoes/actions.ts: roda com a
   sessão do próprio profissional, sem privilégio especial. */

/* Sem gateway de pagamento integrado, não existe "trocar de plano na
   hora" de verdade — isso seria inventar uma cobrança que não
   aconteceu. Grava só a intenção em workspaces.requested_plan_id
   (RLS "update_own" já cobre isso, mesma trava de nome/telefone em
   Configurações); o time processa manualmente por enquanto, mesma
   filosofia documentada em schema_pro_025.sql pra fase pré-lançamento. */
export async function solicitarUpgrade(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { error } = await supabase
    .from('workspaces')
    .update({ requested_plan_id: planId, requested_plan_at: new Date().toISOString() })
    .eq('owner_id', user.id);
  if (error) return { ok: false as const, error: 'Não foi possível registrar sua solicitação. Tente novamente.' };

  revalidatePath('/pro/assinatura');
  return { ok: true as const };
}

/* solicitar_cancelamento_assinatura (schema_pro_030.sql, SECURITY
   DEFINER) — mesmo motivo de set_patient_access_source: uma mutação
   estreita em vez de afrouxar a RLS "write_financeiro" de subscriptions
   pro profissional. Só marca a intenção; não há gateway pra suspender
   cobrança de verdade ainda. */
export async function cancelarAssinatura(reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { error } = await supabase.rpc('solicitar_cancelamento_assinatura', { p_reason: reason ?? null });
  if (error) return { ok: false as const, error: error.message || 'Não foi possível cancelar. Tente novamente.' };

  revalidatePath('/pro/assinatura');
  return { ok: true as const };
}
