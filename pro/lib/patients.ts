import type { SupabaseClient } from '@supabase/supabase-js';

export type PacienteLista = {
  id: string;
  nome: string;
  email: string | null;
  pesoAtual: number | null;
  ultimoRegistro: string;
  dataVinculo: string | null;
  perfilCompleto: boolean;
};

/* Lista de pacientes vinculados (status='active'). Reaproveita a
   mesma view agregada da Sprint 017 (workspace_patient_summary) —
   nenhuma consulta nova por paciente, só mais uma pequena e
   direcionada (patient_relationships pra pegar o e-mail digitado no
   convite, usado na busca). "Último acesso" (pedido no brief) não
   entrou aqui de propósito: exigiria a Admin API do Supabase (chave
   service_role, nunca deveria viver num app cliente sem uma decisão
   explícita sobre isso) — documentado, não inventado. "Última
   atualização" (ultimo_registro, já disponível) cobre a necessidade
   real de "sei se esse paciente está ativo". */
export async function listarPacientes(supabase: SupabaseClient): Promise<PacienteLista[]> {
  const { data } = await supabase
    .from('workspace_patient_summary')
    .select('patient_id, nome, peso_atual, ultimo_registro, data_vinculo, perfil_completo')
    .order('ultimo_registro', { ascending: false });

  if (!data || data.length === 0) return [];

  const ids = data.map((r) => r.patient_id);
  const { data: relacionamentos } = await supabase
    .from('patient_relationships')
    .select('patient_id, patient_email')
    .in('patient_id', ids)
    .eq('status', 'active');
  const emailById = new Map((relacionamentos ?? []).map((r) => [r.patient_id, r.patient_email as string | null]));

  return data.map((r) => ({
    id: r.patient_id,
    nome: r.nome || emailById.get(r.patient_id) || 'Paciente',
    email: emailById.get(r.patient_id) ?? null,
    pesoAtual: r.peso_atual,
    ultimoRegistro: r.ultimo_registro,
    dataVinculo: r.data_vinculo,
    perfilCompleto: r.perfil_completo,
  }));
}
