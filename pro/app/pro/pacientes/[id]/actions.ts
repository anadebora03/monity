'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/* Encerrar acompanhamento (Sprint 3 — Perfis/Configurações): a RLS
   de patient_relationships (schema_pro_026.sql, policy
   "update_linked") já só permite UPDATE pra status='ended', pro dono
   do workspace ou pro próprio paciente — nunca reabre, nunca troca
   patient_id/workspace_id. Isso encerra o VÍNCULO, nunca a conta do
   paciente: nenhuma policy de RLS jamais deu ao profissional
   permissão de mexer nas 8 tabelas de dados do paciente (só SELECT),
   então "bloquear"/"excluir" a conta dele não é uma ação que o
   profissional tecnicamente consegue executar — e por isso não é
   oferecida aqui, independente de access_source. */
export async function encerrarAcompanhamento(relationshipId: string, motivo: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { error } = await supabase
    .from('patient_relationships')
    .update({ status: 'ended', ended_at: new Date().toISOString(), ended_reason: motivo.trim() || 'Encerrado pelo profissional' })
    .eq('id', relationshipId);

  if (error) return { ok: false as const, error: 'Não foi possível encerrar o acompanhamento. Tente novamente.' };

  revalidatePath('/pro/pacientes');
  return { ok: true as const };
}

/* Origem do acesso (Sprint 3.2): anotação do profissional, não do
   paciente — ele não tem ação aqui. Passa pela função SECURITY
   DEFINER set_patient_access_source (schema_pro_029.sql) porque a
   policy de UPDATE comum de patient_relationships só aceita
   status='ended' (endurecida de propósito na Sprint 034), e essa
   troca não tem nada a ver com encerrar o vínculo. */
export type AccessSource = 'professional' | 'independent' | null;

export async function atualizarAccessSource(relationshipId: string, accessSource: AccessSource) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { error } = await supabase.rpc('set_patient_access_source', {
    p_relationship_id: relationshipId,
    p_access_source: accessSource,
  });

  if (error) return { ok: false as const, error: 'Não foi possível salvar. Tente novamente.' };

  revalidatePath(`/pro/pacientes/${relationshipId}`, 'page');
  return { ok: true as const };
}
