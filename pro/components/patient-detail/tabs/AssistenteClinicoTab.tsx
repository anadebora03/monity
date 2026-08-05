'use client';

import { useMemo, useState } from 'react';
import { Sparkles, AlertTriangle, AlertOctagon, TrendingUp, TrendingDown, Minus, Activity, GitMerge, History, Compass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { gerarAssistenteClinico, cutoffDoHistorico, type DadosClinicos, type NivelInsight, type PeriodoComparacao, type Tendencia, type HistoricoOpcao } from '@/lib/clinical-intelligence';

const NIVEL_INFO: Record<NivelInsight, { label: string; tone: 'neutral' | 'warn' | 'danger'; Icon: typeof AlertTriangle }> = {
  informativo: { label: 'Informativo', tone: 'neutral', Icon: Activity },
  atencao: { label: 'Atenção', tone: 'warn', Icon: AlertTriangle },
  importante: { label: 'Importante', tone: 'danger', Icon: AlertTriangle },
  prioritario: { label: 'Prioritário', tone: 'danger', Icon: AlertOctagon },
};

const PERIODOS: { id: PeriodoComparacao; label: string }[] = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'tudo', label: 'Todo tratamento' },
];

const HISTORICO: { id: HistoricoOpcao; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: 'semana', label: 'Última semana' },
  { id: 'mes', label: 'Último mês' },
];

const DIRECAO_ICON: Record<Tendencia['direcao'], typeof TrendingUp> = {
  caindo: TrendingDown,
  subindo: TrendingUp,
  estavel: Minus,
  oscilando: Activity,
};

/* Esta aba é exclusiva do profissional — nenhuma dessas análises
   existe em nenhuma tela do app do paciente, nem é sincronizada pra
   lá. Motor próprio (js/../pro/lib/clinical-intelligence.ts),
   independente do motor de Insights do paciente (js/insights.js). */
export function AssistenteClinicoTab({ dados }: { dados: DadosClinicos }) {
  const [periodo, setPeriodo] = useState<PeriodoComparacao>('tudo');
  const [historico, setHistorico] = useState<HistoricoOpcao>('hoje');
  const assistente = useMemo(() => {
    const cutoff = historico === 'hoje' ? undefined : cutoffDoHistorico(historico, new Date().toISOString().slice(0, 10));
    return gerarAssistenteClinico(dados, { periodo, cutoff });
  }, [dados, periodo, historico]);

  if (!assistente.temDados) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <Compass size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Ainda não há dados suficientes para gerar uma análise clínica deste paciente.</p>
        </div>
      </Card>
    );
  }

  const { resumo, alertas, evolucaoGeral, tendencias, correlacoes, timelineDestaques } = assistente;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Ver como em:</span>
        {HISTORICO.map((h) => (
          <button
            key={h.id}
            onClick={() => setHistorico(h.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              historico === h.id ? 'bg-accent text-white dark:bg-accent-light dark:text-navy' : 'bg-slate-100 text-ink-soft hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Resumo Clínico */}
      <Card className="animate-fade-in">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <Sparkles size={13} strokeWidth={2} />
          Resumo clínico
        </div>
        <p className="text-sm leading-relaxed text-ink dark:text-white">{resumo}</p>
      </Card>

      {/* Alertas Inteligentes */}
      <Card className="animate-fade-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Alertas inteligentes</p>
        {alertas.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nada pedindo atenção agora, segundo os dados registrados.</p>
        ) : (
          <ul className="space-y-3">
            {alertas.map((a) => {
              const info = NIVEL_INFO[a.nivel];
              return (
                <li key={a.id} className="rounded-sm border border-slate-100 p-3 dark:border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={info.tone}>
                      <info.Icon size={11} strokeWidth={2.2} className="mr-1 inline -mt-0.5" />
                      {info.label}
                    </Badge>
                    <p className="text-[13px] font-semibold text-ink dark:text-white">{a.titulo}</p>
                  </div>
                  <p className="mt-1.5 text-[13px] text-ink-soft dark:text-white/60">{a.explicacao}</p>
                  <p className="mt-1 text-[13px] text-ink-soft dark:text-white/60">
                    <span className="font-medium text-ink-faint dark:text-white/40">Causa provável: </span>
                    {a.causaProvavel}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-soft dark:text-white/60">
                    <span className="font-medium text-ink-faint dark:text-white/40">Sugestão: </span>
                    {a.sugestaoAcompanhamento}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-faint dark:text-white/40">{a.evidencia.join(' · ')}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Comparações */}
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              periodo === p.id ? 'bg-accent text-white dark:bg-accent-light dark:text-navy' : 'bg-slate-100 text-ink-soft hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Evolução Geral */}
      <Card className="animate-fade-in">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <Activity size={13} strokeWidth={2} />
          Evolução geral
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            ['Adesão', evolucaoGeral.adesao != null ? `${evolucaoGeral.adesao}%` : '—'],
            ['Aplicações', evolucaoGeral.aplicacoes != null ? `${evolucaoGeral.aplicacoes}%` : '—'],
            ['Pesagens', evolucaoGeral.pesagens != null ? `${evolucaoGeral.pesagens}%` : '—'],
            ['Proteína', evolucaoGeral.proteina != null ? `${evolucaoGeral.proteina}%` : '—'],
            ['Água', evolucaoGeral.agua != null ? `${evolucaoGeral.agua}%` : '—'],
            ['Sintomas', evolucaoGeral.sintomasNivel ? { baixa: 'Baixa', media: 'Média', alta: 'Alta' }[evolucaoGeral.sintomasNivel] : '—'],
          ].map(([label, value]) => (
            <div key={label} className="text-center">
              <p className="text-lg font-bold text-ink dark:text-white">{value}</p>
              <p className="text-[11px] text-ink-faint dark:text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tendências */}
      <Card className="animate-fade-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Tendências</p>
        {tendencias.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Ainda não há histórico suficiente no período selecionado para identificar tendências.</p>
        ) : (
          <ul className="space-y-2.5">
            {tendencias.map((t) => {
              const Icon = DIRECAO_ICON[t.direcao];
              return (
                <li key={t.metrica} className="flex items-start gap-2.5">
                  <Icon size={16} strokeWidth={2} className={t.direcao === 'caindo' ? 'mt-0.5 shrink-0 text-good' : t.direcao === 'subindo' ? 'mt-0.5 shrink-0 text-danger' : 'mt-0.5 shrink-0 text-ink-faint dark:text-white/40'} />
                  <div>
                    <p className="text-[13px] font-semibold text-ink dark:text-white">{t.label}</p>
                    <p className="text-[13px] text-ink-soft dark:text-white/60">{t.texto}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Linha do Tempo Inteligente */}
      {timelineDestaques.length > 0 && (
        <Card className="animate-fade-in">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
            <History size={13} strokeWidth={2} />
            Linha do tempo inteligente
          </div>
          <ul className="space-y-3">
            {timelineDestaques.map((d, i) => (
              <li key={i}>
                <p className="text-[13px] font-semibold text-ink dark:text-white">{d.evento}</p>
                <p className="text-[13px] text-ink-soft dark:text-white/60">↓ {d.consequencia}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Correlações */}
      <Card className="animate-fade-in">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <GitMerge size={13} strokeWidth={2} />
          Possíveis relações
        </div>
        {correlacoes.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nenhuma relação identificável nos dados registrados até agora.</p>
        ) : (
          <ul className="space-y-3">
            {correlacoes.map((c) => (
              <li key={c.id}>
                <p className="text-[13px] text-ink dark:text-white">{c.texto}</p>
                <p className="mt-1 text-xs text-ink-faint dark:text-white/40">{c.evidencia.join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
