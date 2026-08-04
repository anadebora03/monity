import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSharedEngines } from './shared-engine';
import { getReportPatientData, getProfessionalInfo, registrarEmissao } from './report-data';

export type PeriodoId = '30d' | '60d' | '90d' | 'tudo' | 'custom';

export type ModulosRelatorio = {
  peso: boolean;
  aplicacoes: boolean;
  bioimpedancia: boolean;
  exames: boolean;
  medidas: boolean;
  sintomas: boolean;
  planoAcao: boolean;
  timeline: boolean;
  insights: boolean;
};

export const MODULOS_PADRAO: ModulosRelatorio = {
  peso: true, aplicacoes: true, bioimpedancia: true, exames: true,
  medidas: true, sintomas: true, planoAcao: true, timeline: true, insights: true,
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoBack(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function periodoRange(periodo: PeriodoId, dataInicioTratamento: string | null, custom?: { ini: string; fim: string }): { ini: string; fim: string } {
  const hoje = todayISO();
  if (periodo === '30d') return { ini: isoBack(29), fim: hoje };
  if (periodo === '60d') return { ini: isoBack(59), fim: hoje };
  if (periodo === '90d') return { ini: isoBack(89), fim: hoje };
  if (periodo === 'custom' && custom) return custom;
  return { ini: dataInicioTratamento || isoBack(365 * 5), fim: hoje };
}

/* Monta os três contextos exatamente no formato que TIMELINE.gerar()/
   INSIGHTS.gerar()/ACTIONPLAN.gerar() esperam (mesmo shape de
   buildTimelineContext()/buildInsightContext()/buildActionPlanContext()
   em app.js) — só que os dados vêm do Supabase, não de `S`.
   `insightsHistorico`/status do plano de ação ficam sempre vazios
   aqui: são mecanismos de localStorage do APARELHO DO PACIENTE,
   nunca sincronizam (mesma limitação já documentada nas sprints
   anteriores) — o profissional sempre vê o estado "no momento",
   nunca o que o paciente já marcou como resolvido no próprio app. */
export async function gerarRelatorioHTML({
  supabase,
  patientId,
  periodo,
  custom,
  modulos = MODULOS_PADRAO,
}: {
  supabase: SupabaseClient;
  patientId: string;
  periodo: PeriodoId;
  custom?: { ini: string; fim: string };
  modulos?: ModulosRelatorio;
}): Promise<{ ok: true; html: string; ini: string; fim: string } | { ok: false; error: string }> {
  const [{ TIMELINE, INSIGHTS, ACTIONPLAN, REPORT }, patientData, profissional] = await Promise.all([
    loadSharedEngines(),
    getReportPatientData(supabase, patientId),
    getProfessionalInfo(supabase),
  ]);

  if (!patientData) {
    return { ok: false, error: 'Este paciente ainda não completou o próprio cadastro no app — não há dados suficientes pra gerar um relatório.' };
  }

  const { ini, fim } = periodoRange(periodo, patientData.profile.dataInicio, custom);
  const dailyLogsPorData: Record<string, unknown> = {};
  patientData.dailyLogs.forEach((l) => { dailyLogsPorData[l.date] = l; });

  const achievements = REPORT.achievements(patientData.weighings, patientData.profile);

  const timelineCtx = {
    profile: patientData.profile,
    applications: patientData.applications,
    weighings: patientData.weighings,
    exams: patientData.exams,
    bio: patientData.bio,
    agenda: [],
    dailyLogs: dailyLogsPorData,
    achievements,
    insightsHistorico: [],
  };
  const d = REPORT.coletaDados(patientData, ini, fim);
  const insightCtx = { d, profile: patientData.profile, allApplications: patientData.applications, achievements };

  const tlPeriodo = TIMELINE.gerar(timelineCtx, { ini, fim });
  const tl = tlPeriodo.length > 25
    ? [...tlPeriodo].sort((a, b) => a.prioridade - b.prioridade).slice(0, 25).sort((a, b) => (a.data < b.data ? -1 : 1))
    : tlPeriodo;
  const insightsPeriodo = INSIGHTS.gerar(insightCtx, { registrarHistorico: false }).slice(0, 5);
  const actionCtx = { insights: INSIGHTS.gerar(insightCtx, { registrarHistorico: false }), notifElegiveis: [], applications: patientData.applications, bio: patientData.bio };
  const acoesAlta = ACTIONPLAN.gerar(actionCtx).filter((a) => a.prioridade === 'alta' && a.status !== 'resolvida');

  const html = REPORT.buildPDF({
    profile: patientData.profile,
    d,
    ini,
    fim,
    allWeighings: patientData.weighings,
    timeline: tl,
    insightsPeriodo,
    acoesAlta,
    modulos,
    cabecalho: profissional ? { profissionalNome: profissional.nome, profissao: profissional.profissao } : undefined,
    assinatura: profissional && profissional.crnCrm ? { nome: profissional.nome, profissao: profissional.profissao, crnCrm: profissional.crnCrm } : undefined,
  });

  if (profissional?.workspaceId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await registrarEmissao(supabase, {
        workspaceId: profissional.workspaceId,
        patientId,
        professionalId: user.id,
        periodoIni: ini,
        periodoFim: fim,
        modulos: modulos as unknown as Record<string, boolean>,
      });
    }
  }

  return { ok: true, html, ini, fim };
}
