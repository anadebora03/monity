import type { SupabaseClient } from '@supabase/supabase-js';

/* Camada de dados do Dashboard (Sprint 017). UMA consulta principal
   (workspace_patient_summary, ver supabase/schema_pro_017.sql) +
   duas consultas pequenas e direcionadas (uso do plano, agenda de
   hoje) — nunca uma consulta por paciente. Toda regra "de negócio"
   (quem está em atenção, o resumo do dia, os insights) é derivada em
   JS a partir desse único resultado, não recalculada no banco.

   Nenhum campo aqui é inventado: "horário" e "status" de agenda não
   existem no modelo do paciente (agenda só tem date/tipo/obs), então
   a Agenda do Dia não exibe essas duas colunas — ver AgendaDoDia no
   dashboard. */

type PatientSummaryRow = {
  relationship_id: string;
  workspace_id: string;
  patient_id: string;
  nome: string | null;
  medicamento: string | null;
  dia_aplicacao: number | null;
  peso_inicial: number | null;
  data_inicio: string | null;
  peso_atual: number | null;
  ultima_pesagem_data: string | null;
  peso_30d_atras: number | null;
  ultima_aplicacao_data: string | null;
  ultimo_registro: string;
};

type AgendaRow = { user_id: string; date: string; tipo: string | null; obs: string | null };

export type PacienteDashboard = {
  id: string;
  nome: string;
  pesoAtual: number | null;
  ultimoRegistro: string;
  evolucaoDesdeInicio: number | null; // pesoInicial - pesoAtual, mesma fórmula de lost() no app do paciente
  status: 'evolucao' | 'atencao' | 'sem_dado';
  motivosAtencao: string[];
};

export type DashboardData = {
  temPacientes: boolean;
  pacientesAtivos: number;
  novosEsteMs: number;
  limitePlano: number | null;
  percentualPlano: number | null;
  atualizacoesHoje: number;
  emAtencao: number;
  proximasAplicacoes: { hoje: number; amanha: number; semana: number };
  resumoDia: string[];
  insights: { titulo: string; texto: string; tom: 'good' | 'warn' }[];
  pacientes: PacienteDashboard[];
  agendaHoje: { pacienteNome: string; tipo: string; obs: string | null }[];
};

function todayISO(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
/* Mesma lógica de nextAppInfo() em app.js — a "próxima aplicação
   prevista" nunca é um dado guardado, é sempre calculada a partir do
   dia da semana configurado pelo paciente + a última aplicação
   registrada. Replicar aqui é reaproveitar a mesma regra, não
   inventar uma nova. */
function proximaAplicacao(diaAplicacao: number | null, ultimaAplicacaoData: string | null): number | null {
  if (diaAplicacao == null) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let diff = (diaAplicacao - now.getDay() + 7) % 7;
  const hoje = todayISO(now);
  if (diff === 0 && ultimaAplicacaoData === hoje) diff = 7;
  return diff;
}

export async function getDashboardData(supabase: SupabaseClient, ownerId: string): Promise<DashboardData> {
  const [{ data: rows }, { data: usage }] = await Promise.all([
    supabase
      .from('workspace_patient_summary')
      .select('*')
      .order('ultimo_registro', { ascending: false }),
    supabase.from('workspace_patient_usage').select('patient_limit, patients_used').eq('owner_id', ownerId).maybeSingle(),
  ]);

  const summary = (rows ?? []) as PatientSummaryRow[];
  const hoje = todayISO();

  if (summary.length === 0) {
    return {
      temPacientes: false,
      pacientesAtivos: 0,
      novosEsteMs: 0,
      limitePlano: usage?.patient_limit ?? null,
      percentualPlano: 0,
      atualizacoesHoje: 0,
      emAtencao: 0,
      proximasAplicacoes: { hoje: 0, amanha: 0, semana: 0 },
      resumoDia: [],
      insights: [],
      pacientes: [],
      agendaHoje: [],
    };
  }

  const patientIds = summary.map((r) => r.patient_id);
  const { data: agendaRows } = await supabase
    .from('agenda')
    .select('user_id, date, tipo, obs')
    .in('user_id', patientIds)
    .eq('date', hoje);

  const nomeById = new Map(summary.map((r) => [r.patient_id, r.nome || 'Paciente']));

  const pacientes: PacienteDashboard[] = summary.map((r) => {
    const motivos: string[] = [];
    const diasSemRegistro = diasEntre(r.ultimo_registro.slice(0, 10), hoje);
    if (diasSemRegistro > 10) motivos.push(`Sem registrar há ${diasSemRegistro} dias`);
    if (r.peso_atual != null && r.peso_30d_atras != null && r.peso_atual > r.peso_30d_atras) {
      motivos.push('Ganho de peso no período');
    }
    if (r.ultima_aplicacao_data && diasEntre(r.ultima_aplicacao_data, hoje) > 10) {
      motivos.push('Aplicação em atraso');
    }
    const evolucao = r.peso_inicial != null && r.peso_atual != null ? +(r.peso_inicial - r.peso_atual).toFixed(1) : null;

    return {
      id: r.patient_id,
      nome: r.nome || 'Paciente',
      pesoAtual: r.peso_atual,
      ultimoRegistro: r.ultimo_registro,
      evolucaoDesdeInicio: evolucao,
      status: motivos.length ? 'atencao' : r.peso_atual != null ? 'evolucao' : 'sem_dado',
      motivosAtencao: motivos,
    };
  });

  const atualizacoesHoje = summary.filter((r) => r.ultimo_registro.slice(0, 10) === hoje).length;
  const emAtencaoLista = pacientes.filter((p) => p.status === 'atencao');
  const perderamPeso = summary.filter(
    (r) => r.peso_atual != null && r.peso_30d_atras != null && r.peso_30d_atras - r.peso_atual > 1
  );

  const proximas = summary
    .map((r) => proximaAplicacao(r.dia_aplicacao, r.ultima_aplicacao_data))
    .filter((d): d is number => d != null);
  const proximasAplicacoes = {
    hoje: proximas.filter((d) => d === 0).length,
    amanha: proximas.filter((d) => d === 1).length,
    semana: proximas.filter((d) => d <= 7).length,
  };

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  // novos_este_mes: quantos vínculos foram aceitos desde o início do
  // mês corrente — dado real (accepted_at), não estimado.
  const { count: novosEsteMs } = await supabase
    .from('patient_relationships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('accepted_at', inicioMes.toISOString());

  const resumoDia: string[] = [];
  if (atualizacoesHoje > 0) resumoDia.push(`${atualizacoesHoje} paciente${atualizacoesHoje > 1 ? 's' : ''} atualizou${atualizacoesHoje > 1 ? 'aram' : ''} registros hoje`);
  if (perderamPeso.length > 0) resumoDia.push(`${perderamPeso.length} paciente${perderamPeso.length > 1 ? 's' : ''} perderam mais de 1 kg nos últimos 30 dias`);
  if (emAtencaoLista.length === 1) resumoDia.push(`${emAtencaoLista[0].nome} está ${emAtencaoLista[0].motivosAtencao[0].toLowerCase()}`);
  else if (emAtencaoLista.length > 1) resumoDia.push(`${emAtencaoLista.length} pacientes precisam da sua atenção`);
  if (proximasAplicacoes.amanha > 0) resumoDia.push(`${proximasAplicacoes.amanha} aplicaç${proximasAplicacoes.amanha > 1 ? 'ões' : 'ão'} prevista${proximasAplicacoes.amanha > 1 ? 's' : ''} para amanhã`);

  const insights: DashboardData['insights'] = [];
  if (perderamPeso.length > 0) {
    insights.push({
      titulo: 'Excelente progresso',
      texto: `${perderamPeso.length} paciente${perderamPeso.length > 1 ? 's' : ''} perderam peso nos últimos 30 dias.`,
      tom: 'good',
    });
  }
  const semAtualizar7d = summary.filter((r) => diasEntre(r.ultimo_registro.slice(0, 10), hoje) > 7);
  if (semAtualizar7d.length > 0) {
    insights.push({
      titulo: 'Atenção',
      texto: `${semAtualizar7d.length} paciente${semAtualizar7d.length > 1 ? 's' : ''} está${semAtualizar7d.length > 1 ? 'ão' : ''} há mais de 7 dias sem atualizar dados.`,
      tom: 'warn',
    });
  }

  const agendaHoje = (agendaRows ?? []).map((a: AgendaRow) => ({
    pacienteNome: nomeById.get(a.user_id) || 'Paciente',
    tipo: a.tipo || 'Compromisso',
    obs: a.obs,
  }));

  const limitePlano = usage?.patient_limit ?? null;
  const percentualPlano = limitePlano ? Math.round((summary.length / limitePlano) * 100) : null;

  return {
    temPacientes: true,
    pacientesAtivos: summary.length,
    novosEsteMs: novosEsteMs ?? 0,
    limitePlano,
    percentualPlano,
    atualizacoesHoje,
    emAtencao: emAtencaoLista.length,
    proximasAplicacoes,
    resumoDia,
    insights,
    pacientes,
    agendaHoje,
  };
}
