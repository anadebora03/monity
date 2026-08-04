import type { SupabaseClient } from '@supabase/supabase-js';

/* Camada de dados do Relatório Clínico (Sprint 020). Busca os
   mesmos registros que o app do paciente lê de `S` — só que daqui
   vêm do Supabase, pela RLS "select_pro" já existente (Sprint 015).
   O formato de saída já é o que REPORT.coletaDados() (js/report-
   engine.js, carregado no navegador via public/shared-engine/)
   espera receber — nenhuma tradução acontece no cliente. */

export type ReportProfile = {
  nome: string;
  medicamento: string | null;
  doseAtual: string | null;
  unidade: string | null;
  diaAplicacao: number | null;
  dataInicio: string | null;
  pesoInicial: number | null;
  pesoMeta: number | null;
  altura: number | null;
  metaAgua: number | null;
  metaProteina: number | null;
};

export type ReportPatientData = {
  profile: ReportProfile;
  weighings: { date: string; peso: number; cintura: number | null; quadril: number | null; abdomen: number | null; coxa: number | null; braco: number | null }[];
  applications: { date: string; dose: string | null; medicamento: string | null; local: string | null; obs: string | null }[];
  dailyLogs: { date: string; agua: number | null; proteina: number | null; sintomas: string[] | null; humor: number | null; apetite: string | null }[];
  bio: { date: string; gordura: number | null; massaMagraPct: number | null; musculo: number | null; agua: number | null; visceral: number | null; tmb: number | null }[];
  exams: { date: string; tipo: string | null; valor: string | null }[];
};

export async function getReportPatientData(supabase: SupabaseClient, patientId: string): Promise<ReportPatientData | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, medicamento, dose_atual, unidade, dia_aplicacao, data_inicio, peso_inicial, peso_meta, altura, meta_agua, meta_proteina')
    .eq('id', patientId)
    .maybeSingle();

  // sem perfil completo (paciente ainda não abriu o app pra terminar o
  // próprio cadastro — mesmo achado da Sprint 018), não há dados
  // suficientes pra montar um relatório de verdade.
  if (!profile) return null;

  const [{ data: weighings }, { data: applications }, { data: dailyLogs }, { data: bio }, { data: exams }] = await Promise.all([
    supabase.from('weighings').select('date, peso, cintura, quadril, abdomen, coxa, braco').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('applications').select('date, dose, medicamento, local, obs').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('daily_logs').select('date, agua, proteina, sintomas, humor, apetite').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('bioimpedance').select('date, gordura, massa_magra, musculo, agua, visceral, tmb').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('exams').select('date, tipo, valor').eq('user_id', patientId).order('date', { ascending: true }),
  ]);

  return {
    profile: {
      nome: profile.nome || 'Paciente',
      medicamento: profile.medicamento,
      doseAtual: profile.dose_atual,
      unidade: profile.unidade,
      diaAplicacao: profile.dia_aplicacao,
      dataInicio: profile.data_inicio,
      pesoInicial: profile.peso_inicial,
      pesoMeta: profile.peso_meta,
      altura: profile.altura,
      metaAgua: profile.meta_agua,
      metaProteina: profile.meta_proteina,
    },
    weighings: weighings ?? [],
    applications: applications ?? [],
    dailyLogs: dailyLogs ?? [],
    bio: (bio ?? []).map((b) => ({ date: b.date, gordura: b.gordura, massaMagraPct: b.massa_magra, musculo: b.musculo, agua: b.agua, visceral: b.visceral, tmb: b.tmb })),
    exams: exams ?? [],
  };
}

export type ProfessionalInfo = { nome: string; profissao: string | null; crnCrm: string | null; workspaceId: string | null };

export async function getProfessionalInfo(supabase: SupabaseClient): Promise<ProfessionalInfo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: pp }, { data: ws }] = await Promise.all([
    supabase.from('professional_profiles').select('nome, crn_crm, profession_id').eq('id', user.id).maybeSingle(),
    supabase.from('workspaces').select('id').eq('owner_id', user.id).maybeSingle(),
  ]);

  let profissao: string | null = null;
  if (pp?.profession_id) {
    const { data: prof } = await supabase.from('professions').select('nome').eq('id', pp.profession_id).maybeSingle();
    profissao = prof?.nome ?? null;
  }

  return {
    nome: pp?.nome || user.email || 'Profissional',
    profissao,
    crnCrm: pp?.crn_crm ?? null,
    workspaceId: ws?.id ?? null,
  };
}

export async function registrarEmissao(
  supabase: SupabaseClient,
  params: { workspaceId: string; patientId: string; professionalId: string; periodoIni: string; periodoFim: string; modulos: Record<string, boolean> }
) {
  await supabase.from('report_emissions').insert({
    workspace_id: params.workspaceId,
    patient_id: params.patientId,
    professional_id: params.professionalId,
    periodo_ini: params.periodoIni,
    periodo_fim: params.periodoFim,
    modulos: params.modulos,
  });
}

export type EmissaoRow = {
  id: string;
  patientId: string;
  patientNome: string;
  periodoIni: string;
  periodoFim: string;
  profissionalNome: string;
  createdAt: string;
};

export async function listarEmissoes(supabase: SupabaseClient, filtros?: { patientId?: string }): Promise<EmissaoRow[]> {
  let q = supabase.from('report_emissions').select('id, patient_id, periodo_ini, periodo_fim, created_at').order('created_at', { ascending: false });
  if (filtros?.patientId) q = q.eq('patient_id', filtros.patientId);
  const { data } = await q;
  if (!data || data.length === 0) return [];

  const patientIds = [...new Set(data.map((r) => r.patient_id))];
  const [{ data: profiles }, prof] = await Promise.all([
    supabase.from('profiles').select('id, nome').in('id', patientIds),
    getProfessionalInfo(supabase),
  ]);
  const nomeById = new Map((profiles ?? []).map((p) => [p.id, p.nome as string | null]));

  return data.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    patientNome: nomeById.get(r.patient_id) || 'Paciente',
    periodoIni: r.periodo_ini,
    periodoFim: r.periodo_fim,
    profissionalNome: prof?.nome || '—',
    createdAt: r.created_at,
  }));
}
