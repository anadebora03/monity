import type { SupabaseClient } from '@supabase/supabase-js';

export type StatusCompromisso = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'reagendado';
export const TIPOS_COMPROMISSO = ['Consulta Inicial', 'Retorno', 'Bioimpedância', 'Avaliação', 'Teleconsulta', 'Outro'] as const;
export type TipoCompromisso = (typeof TIPOS_COMPROMISSO)[number];

export type Compromisso = {
  id: string;
  patientId: string | null;
  patientNome: string | null;
  titulo: string | null;
  data: string;
  hora: string | null;
  duracaoMin: number;
  tipo: string;
  observacoes: string | null;
  cor: string;
  status: StatusCompromisso;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

async function enriquecerComNomes(supabase: SupabaseClient, rows: any[]): Promise<Compromisso[]> {
  const patientIds = [...new Set(rows.map((r) => r.patient_id).filter(Boolean))];
  let nomeById = new Map<string, string>();
  if (patientIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, nome').in('id', patientIds);
    nomeById = new Map((profiles ?? []).map((p) => [p.id, p.nome as string]));
  }
  return rows.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    patientNome: r.patient_id ? nomeById.get(r.patient_id) || 'Paciente' : null,
    titulo: r.titulo,
    data: r.data,
    hora: r.hora,
    duracaoMin: r.duracao_min,
    tipo: r.tipo,
    observacoes: r.observacoes,
    cor: r.cor,
    status: r.status,
  }));
}

/* Carrega só a janela pedida (nunca "todos os meses" — pedido
   explícito de performance da Sprint 021). O calendário mensal pede
   um mês por vez; a view de dia/semana pede um recorte menor ainda. */
export async function listarCompromissos(supabase: SupabaseClient, ini: string, fim: string): Promise<Compromisso[]> {
  const { data } = await supabase
    .from('compromissos')
    .select('id, patient_id, titulo, data, hora, duracao_min, tipo, observacoes, cor, status')
    .gte('data', ini)
    .lte('data', fim)
    .order('data', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true });
  if (!data || data.length === 0) return [];
  return enriquecerComNomes(supabase, data);
}

export async function criarCompromisso(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    patientId: string | null;
    titulo: string | null;
    data: string;
    hora: string | null;
    duracaoMin: number;
    tipo: string;
    observacoes: string | null;
    cor: string;
    status: StatusCompromisso;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('compromissos').insert({
    workspace_id: params.workspaceId,
    patient_id: params.patientId,
    titulo: params.titulo,
    data: params.data,
    hora: params.hora,
    duracao_min: params.duracaoMin,
    tipo: params.tipo,
    observacoes: params.observacoes,
    cor: params.cor,
    status: params.status,
  });
  if (error) return { ok: false, error: 'Não foi possível salvar o compromisso. Tente novamente.' };
  return { ok: true };
}

export async function atualizarStatusCompromisso(supabase: SupabaseClient, id: string, status: StatusCompromisso) {
  await supabase.from('compromissos').update({ status }).eq('id', id);
}

export type PacienteResumoRapido = {
  pesoAtual: number | null;
  diasSemAtualizar: number | null;
  medicamento: string | null;
  doseAtual: string | null;
  unidade: string | null;
  ultimaAplicacaoData: string | null;
};

/* Painel "Integração inteligente" do modal — só dispara quando um
   paciente é selecionado, nunca numa lista grande. */
export async function getPacienteResumoRapido(supabase: SupabaseClient, patientId: string): Promise<PacienteResumoRapido | null> {
  const [{ data: resumo }, { data: profile }] = await Promise.all([
    supabase.from('workspace_patient_summary').select('peso_atual, ultimo_registro, ultima_aplicacao_data, medicamento').eq('patient_id', patientId).maybeSingle(),
    supabase.from('profiles').select('dose_atual, unidade').eq('id', patientId).maybeSingle(),
  ]);
  if (!resumo) return null;
  return {
    pesoAtual: resumo.peso_atual,
    diasSemAtualizar: resumo.ultimo_registro ? diasEntre(resumo.ultimo_registro.slice(0, 10), todayISO()) : null,
    medicamento: resumo.medicamento,
    doseAtual: profile?.dose_atual ?? null,
    unidade: profile?.unidade ?? null,
    ultimaAplicacaoData: resumo.ultima_aplicacao_data,
  };
}

export type PacienteSemAtualizacao = { patientId: string; nome: string; dias: number };

export async function pacientesSemAtualizacao(supabase: SupabaseClient, limite = 8): Promise<PacienteSemAtualizacao[]> {
  const { data } = await supabase.from('workspace_patient_summary').select('patient_id, nome, ultimo_registro').eq('perfil_completo', true);
  if (!data) return [];
  const hoje = todayISO();
  return data
    .map((r) => ({ patientId: r.patient_id as string, nome: (r.nome as string) || 'Paciente', dias: diasEntre((r.ultimo_registro as string).slice(0, 10), hoje) }))
    .filter((r) => r.dias > 5)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, limite);
}

export type ProximaAplicacao = { patientId: string; nome: string; medicamento: string | null };

/* "Aplica hoje" = dia_aplicacao (0-6, mesmo campo já usado em toda
   a plataforma) bate com o dia da semana de hoje. Não é uma consulta
   nova — dia_aplicacao já vem de workspace_patient_summary. */
export async function proximasAplicacoesHoje(supabase: SupabaseClient): Promise<ProximaAplicacao[]> {
  const { data } = await supabase.from('workspace_patient_summary').select('patient_id, nome, medicamento, dia_aplicacao').eq('perfil_completo', true);
  if (!data) return [];
  const hojeDiaSemana = new Date().getDay();
  return data
    .filter((r) => r.dia_aplicacao === hojeDiaSemana)
    .map((r) => ({ patientId: r.patient_id as string, nome: (r.nome as string) || 'Paciente', medicamento: r.medicamento }));
}

export async function proximosRetornos(supabase: SupabaseClient, limite = 6): Promise<Compromisso[]> {
  const hoje = todayISO();
  const { data } = await supabase
    .from('compromissos')
    .select('id, patient_id, titulo, data, hora, duracao_min, tipo, observacoes, cor, status')
    .eq('tipo', 'Retorno')
    .gte('data', hoje)
    .neq('status', 'cancelado')
    .order('data', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true })
    .limit(limite);
  if (!data || data.length === 0) return [];
  return enriquecerComNomes(supabase, data);
}

export type AlertaClinico = { texto: string; patientId: string | null; tom: 'warn' | 'danger' };

/* "Necessitam atenção" — reaproveita os mesmos limiares já usados no
   Dashboard (Sprint 017) e no Perfil 360° (Sprint 019), só que
   listados individualmente em vez de agregados num contador. Nunca
   recalcula uma regra nova: são as mesmas condições, em formato de
   lista. */
export async function getAlertasClinicos(supabase: SupabaseClient): Promise<AlertaClinico[]> {
  const hoje = todayISO();
  const [{ data: pacientes }, { data: cancelados }] = await Promise.all([
    supabase.from('workspace_patient_summary').select('patient_id, nome, ultimo_registro, ultima_pesagem_data, ultima_aplicacao_data').eq('perfil_completo', true),
    supabase.from('compromissos').select('id, patient_id, titulo, tipo, data, updated_at').eq('status', 'cancelado').eq('tipo', 'Retorno').gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  const alertas: AlertaClinico[] = [];
  (pacientes ?? []).forEach((p) => {
    const nome = (p.nome as string) || 'Paciente';
    if (p.ultimo_registro) {
      const dias = diasEntre((p.ultimo_registro as string).slice(0, 10), hoje);
      if (dias > 10) alertas.push({ texto: `${nome} está há ${dias} dias sem registrar.`, patientId: p.patient_id as string, tom: dias > 20 ? 'danger' : 'warn' });
    }
    if (p.ultima_pesagem_data) {
      const dias = diasEntre((p.ultima_pesagem_data as string).slice(0, 10), hoje);
      if (dias > 20) alertas.push({ texto: `${nome} está sem pesagem há ${dias} dias.`, patientId: p.patient_id as string, tom: 'warn' });
    }
    if (p.ultima_aplicacao_data) {
      const dias = diasEntre((p.ultima_aplicacao_data as string).slice(0, 10), hoje);
      if (dias > 10) alertas.push({ texto: `${nome} pode ter perdido uma aplicação (${dias} dias desde a última).`, patientId: p.patient_id as string, tom: 'danger' });
    }
  });
  (cancelados ?? []).forEach((c) => {
    alertas.push({ texto: `Um retorno foi cancelado recentemente.`, patientId: c.patient_id as string | null, tom: 'warn' });
  });
  return alertas;
}

export type AgendaStats = { consultasHoje: number; retornosProximos: number; pacientesSemAtualizacao: number; tarefasPendentes: number };

/* Cabeçalho da Agenda. "Tarefas pendentes" = compromissos cuja data
   já passou (ou é hoje) e que nunca foram marcados como realizado/
   cancelado/reagendado — ficaram "esquecidos" no status inicial. */
export async function getAgendaStats(supabase: SupabaseClient): Promise<AgendaStats> {
  const hoje = todayISO();
  const [{ count: consultasHoje }, retornos, semAtualizacao, { count: tarefasPendentes }] = await Promise.all([
    supabase.from('compromissos').select('id', { count: 'exact', head: true }).eq('data', hoje).neq('status', 'cancelado'),
    proximosRetornos(supabase, 100),
    pacientesSemAtualizacao(supabase, 100),
    supabase.from('compromissos').select('id', { count: 'exact', head: true }).lte('data', hoje).eq('status', 'agendado'),
  ]);
  return {
    consultasHoje: consultasHoje ?? 0,
    retornosProximos: retornos.length,
    pacientesSemAtualizacao: semAtualizacao.length,
    tarefasPendentes: tarefasPendentes ?? 0,
  };
}
