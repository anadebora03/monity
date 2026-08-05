import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSharedEngines } from './shared-engine';
import { getReportPatientData, getProfessionalInfo, registrarEmissao } from './report-data';
import { listarPlanosTerapeuticos, statsPacientePlano } from './plano-terapeutico-data';
import { buscarDadosClinicos, gerarAssistenteClinico, type NivelInsight } from './clinical-intelligence';

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
  planoTerapeutico: boolean;
  assistenteClinico: boolean;
};

export const MODULOS_PADRAO: ModulosRelatorio = {
  peso: true, aplicacoes: true, bioimpedancia: true, exames: true,
  medidas: true, sintomas: true, planoAcao: true, timeline: true, insights: true,
  planoTerapeutico: true,
  // desligado por padrão de propósito: é a única seção com conteúdo
  // que o paciente nunca deve ver — o profissional precisa marcar
  // conscientemente antes de incluir no PDF (ver ReportModal.tsx).
  assistenteClinico: false,
};

/* Fragmento à parte, NUNCA dentro de js/report-engine.js — esse motor
   é compartilhado com o app do paciente (Sprint 020) e o Assistente
   Clínico é dado exclusivo do profissional (Sprint 023). Misturar os
   dois no mesmo motor arriscaria vazar essa seção pra qualquer
   consumidor futuro do engine compartilhado. Reaproveita as classes
   CSS que já existem no <style> do PDF (.section/.card/.kv/.kl/.kv2)
   só por injeção de HTML, sem tocar no arquivo compartilhado. */
const NIVEL_COR: Record<NivelInsight, string> = {
  informativo: 'var(--gray)',
  atencao: 'var(--amber)',
  importante: 'var(--symptom)',
  prioritario: 'var(--symptom)',
};
const NIVEL_LABEL: Record<NivelInsight, string> = {
  informativo: 'Informativo',
  atencao: 'Atenção',
  importante: 'Importante',
  prioritario: 'Prioritário',
};
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderAssistenteClinicoHTML(a: ReturnType<typeof gerarAssistenteClinico>): string {
  if (!a.temDados) return '';
  const alertasHtml = a.alertas.length
    ? a.alertas
        .map(
          (al) => `<div style="margin-bottom:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px">
        <div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${NIVEL_COR[al.nivel]};margin-bottom:4px">${NIVEL_LABEL[al.nivel]}</div>
        <div style="font-size:9pt;font-weight:700;color:var(--navy);margin-bottom:3px">${esc(al.titulo)}</div>
        <div style="font-size:8pt;color:var(--ink)">${esc(al.explicacao)}</div>
        <div style="font-size:7.5pt;color:var(--gray);margin-top:3px">Sugestão: ${esc(al.sugestaoAcompanhamento)}</div>
      </div>`
        )
        .join('')
    : `<p style="font-size:8pt;color:var(--gray)">Nada pedindo atenção no momento, segundo os dados registrados.</p>`;

  const evolucao = a.evolucaoGeral;
  const evolucaoHtml = `<div class="kv c3" style="margin-bottom:14px">
    <div class="kc"><div class="kl">Adesão</div><div class="kv2">${evolucao.adesao != null ? evolucao.adesao + '%' : '—'}</div></div>
    <div class="kc"><div class="kl">Proteína</div><div class="kv2">${evolucao.proteina != null ? evolucao.proteina + '%' : '—'}</div></div>
    <div class="kc"><div class="kl">Água</div><div class="kv2">${evolucao.agua != null ? evolucao.agua + '%' : '—'}</div></div>
  </div>`;

  const tendenciasHtml = a.tendencias.length
    ? `<ul style="font-size:8pt;color:var(--ink);margin:0 0 14px 16px;padding:0">${a.tendencias.map((t) => `<li style="margin-bottom:3px">${esc(t.label)}: ${esc(t.texto)}</li>`).join('')}</ul>`
    : '';

  const correlacoesHtml = a.correlacoes.length
    ? `<ul style="font-size:8pt;color:var(--ink);margin:0 0 0 16px;padding:0">${a.correlacoes.map((c) => `<li style="margin-bottom:3px">${esc(c.texto)}</li>`).join('')}</ul>`
    : '';

  return `<div class="section">
    <div class="section-head"><span class="dot"></span><span class="section-title">Assistente clínico</span></div>
    <p style="font-size:8.5pt;color:var(--ink);margin-bottom:14px">${esc(a.resumo)}</p>
    ${alertasHtml}
    ${evolucaoHtml}
    ${tendenciasHtml}
    ${correlacoesHtml}
    <p style="font-size:6.5pt;color:var(--gray-soft);margin-top:10px">Análise gerada por regras determinísticas a partir dos dados registrados — não substitui o julgamento clínico do profissional.</p>
  </div>`;
}

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
  const planosTerapeuticos = await listarPlanosTerapeuticos(supabase, patientId);
  const planoTerapeutico = statsPacientePlano(planosTerapeuticos);

  let html = REPORT.buildPDF({
    profile: patientData.profile,
    d,
    ini,
    fim,
    allWeighings: patientData.weighings,
    timeline: tl,
    insightsPeriodo,
    acoesAlta,
    planoTerapeutico,
    modulos,
    cabecalho: profissional ? { profissionalNome: profissional.nome, profissao: profissional.profissao } : undefined,
    assinatura: profissional && profissional.crnCrm ? { nome: profissional.nome, profissao: profissional.profissao, crnCrm: profissional.crnCrm } : undefined,
  });

  if (modulos.assistenteClinico) {
    const dadosClinicos = await buscarDadosClinicos(supabase, patientId);
    const assistente = gerarAssistenteClinico(dadosClinicos);
    const fragmento = renderAssistenteClinicoHTML(assistente);
    if (fragmento) html = html.replace('</body>', `${fragmento}</body>`);
  }

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
