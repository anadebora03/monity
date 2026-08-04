'use client';

/* Carrega, no navegador, os motores compartilhados com o app do
   paciente (public/shared-engine/*.js — cópia em build-time de
   js/*.js na raiz do repo, ver scripts/sync-shared.js). Mesmo
   mecanismo de ponte que index.html usa pro app do paciente
   (window.__xReady + window.__resolveXReady): esses arquivos são
   cópias byte-a-byte, então esperam exatamente esse contrato. */

type TimelineEvent = { id: string; data: string; categoria: string; prioridade: number; titulo: string; descricao: string };
type InsightItem = { id: string; categoria: string; tipo: string; prioridade: number; text: string; justificativa: string; assinatura: unknown };
type ActionItem = { id: string; categoria: string; titulo: string; descricao: string; motivo: string; prioridade: 'alta' | 'media' | 'baixa'; status: string };
type Achievement = { on: boolean; ic: string; t: string; s: string; date: string | null };

export type TimelineApi = { gerar: (ctx: unknown, opts?: { ini?: string; fim?: string }) => TimelineEvent[] };
export type InsightsApi = { gerar: (ctx: unknown, opts?: { registrarHistorico?: boolean }) => InsightItem[]; listarHistorico: () => unknown[] };
export type ActionplanApi = { gerar: (ctx: unknown) => ActionItem[] };
export type ReportApi = {
  coletaDados: (data: unknown, ini: string, fim: string) => Record<string, unknown>;
  gerarResumo: (d: unknown, ini: string, fim: string, profile: unknown) => string;
  buildPDF: (ctx: unknown) => string;
  achievements: (weighings: unknown[], profile: unknown) => Achievement[];
};

declare global {
  interface Window {
    __timelineReady?: Promise<TimelineApi>;
    __resolveTimelineReady?: (v: TimelineApi) => void;
    __insightsReady?: Promise<InsightsApi>;
    __resolveInsightsReady?: (v: InsightsApi) => void;
    __actionplanReady?: Promise<ActionplanApi>;
    __resolveActionplanReady?: (v: ActionplanApi) => void;
    __reportReady?: Promise<ReportApi>;
    __resolveReportReady?: (v: ReportApi) => void;
  }
}

let loaded: Promise<{ TIMELINE: TimelineApi; INSIGHTS: InsightsApi; ACTIONPLAN: ActionplanApi; REPORT: ReportApi }> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar ' + src));
    document.head.appendChild(s);
  });
}

export function loadSharedEngines() {
  if (loaded) return loaded;
  loaded = (async () => {
    window.__timelineReady = new Promise((resolve) => { window.__resolveTimelineReady = resolve; });
    window.__insightsReady = new Promise((resolve) => { window.__resolveInsightsReady = resolve; });
    window.__actionplanReady = new Promise((resolve) => { window.__resolveActionplanReady = resolve; });
    window.__reportReady = new Promise((resolve) => { window.__resolveReportReady = resolve; });
    await Promise.all([
      loadScript('/shared-engine/timeline.js'),
      loadScript('/shared-engine/insights.js'),
      loadScript('/shared-engine/actionplan.js'),
      loadScript('/shared-engine/report-engine.js'),
    ]);
    const [TIMELINE, INSIGHTS, ACTIONPLAN, REPORT] = await Promise.all([
      window.__timelineReady!, window.__insightsReady!, window.__actionplanReady!, window.__reportReady!,
    ]);
    return { TIMELINE, INSIGHTS, ACTIONPLAN, REPORT };
  })();
  return loaded;
}
