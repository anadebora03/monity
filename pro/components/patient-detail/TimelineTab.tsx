'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin, Sparkles, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { TimelineEvent } from '@/lib/patient-detail';
import { TIMELINE_ICON, fmtBR } from '@/components/patient-detail/TimelineList';

/* Jornada Clínica (Sprint 028, redesenhada após feedback direto da
   usuária). Não é uma lista de eventos — é uma narrativa: cada dia
   vira um bloco com cabeçalho forte, os eventos comuns daquele dia
   se encadeiam com um conector "↓" (em vez de cards soltos e
   repetidos), e os eventos importantes (marco, troca de
   medicamento, relatório) ganham um card "premium" que quebra o
   encadeamento e chama atenção sozinho — 3 pesos visuais diferentes
   (pequeno/médio/grande), pedido explícito do feedback. */

type Filtro = { label: string; categorias: TimelineEvent['categoria'][] };
const FILTROS: Filtro[] = [
  { label: 'Aplicações', categorias: ['aplicacao', 'dose', 'medicamento'] },
  { label: 'Peso', categorias: ['peso'] },
  { label: 'Bioimpedância', categorias: ['bioimpedancia'] },
  { label: 'Exames', categorias: ['exame'] },
  { label: 'Agenda', categorias: ['consulta', 'retorno'] },
  { label: 'Plano Terapêutico', categorias: ['plano'] },
  { label: 'Conquistas', categorias: ['conquista'] },
];

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
function fmtDiaHeader(iso: string): { dia: string; mes: string; ano: string } {
  const [y, m, d] = iso.split('-');
  return { dia: d, mes: MESES[+m - 1], ano: y };
}
function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

type Peso = 'grande' | 'medio' | 'pequeno';
function pesoVisual(ev: TimelineEvent): Peso {
  if (ev.destaque) return 'grande';
  if (ev.categoria === 'consulta' || ev.categoria === 'retorno' || ev.categoria === 'plano' || ev.categoria === 'cadastro' || ev.categoria === 'convite') return 'medio';
  return 'pequeno';
}

const LOTE = 12; // quantos GRUPOS de dia aparecem por vez — paginação client-side, sem nova consulta

export function TimelineTab({ eventos, dataInicio, onAbrirEvento }: { eventos: TimelineEvent[]; dataInicio: string | null; onAbrirEvento: (categoria: TimelineEvent['categoria']) => void }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string | null>(null);
  const [visivel, setVisivel] = useState(LOTE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return eventos.filter((ev) => {
      if (filtro) {
        const f = FILTROS.find((x) => x.label === filtro);
        if (f && !f.categorias.includes(ev.categoria)) return false;
      }
      if (q && !(ev.titulo.toLowerCase().includes(q) || ev.descricao.toLowerCase().includes(q) || fmtBR(ev.data).includes(q))) return false;
      return true;
    });
  }, [eventos, busca, filtro]);

  // agrupamento por dia — a lista já chega ordenada por data desc, então
  // datas iguais são sempre contíguas: um único reduce resolve o grupo.
  const grupos = useMemo(() => {
    const out: { data: string; eventos: TimelineEvent[] }[] = [];
    filtrados.forEach((ev) => {
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.data === ev.data) ultimo.eventos.push(ev);
      else out.push({ data: ev.data, eventos: [ev] });
    });
    return out;
  }, [filtrados]);

  useEffect(() => setVisivel(LOTE), [busca, filtro]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisivel((v) => Math.min(grupos.length, v + LOTE));
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [grupos.length]);

  const gruposVisiveis = grupos.slice(0, visivel);

  return (
    <Card className="animate-fade-in">
      <div className="mb-1">
        <p className="text-base font-bold text-ink dark:text-white">Jornada do paciente</p>
        <p className="mt-0.5 text-sm text-ink-soft dark:text-white/60">A história completa do tratamento, contada em ordem — sem precisar trocar de aba.</p>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-white/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por data, medicamento, dose, peso… (ex: 7 mg)"
            className="w-full rounded-sm border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFiltro(null)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            filtro === null ? 'bg-accent text-white dark:bg-accent-light dark:text-navy' : 'bg-slate-100 text-ink-soft hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
          }`}
        >
          Todos
        </button>
        {FILTROS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFiltro((c) => (c === f.label ? null : f.label))}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              filtro === f.label ? 'bg-accent text-white dark:bg-accent-light dark:text-navy' : 'bg-slate-100 text-ink-soft hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <MapPin size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">
            {eventos.length === 0 ? 'Este paciente ainda não tem nenhum evento registrado.' : 'Nenhum evento encontrado para essa busca.'}
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-9">
          {gruposVisiveis.map((g) => {
            const { dia, mes, ano } = fmtDiaHeader(g.data);
            const semana = dataInicio ? Math.max(1, Math.floor(diasEntre(dataInicio, g.data) / 7) + 1) : null;
            return (
              <div key={g.data}>
                {/* separador estilo "Apple Health" — regra cheia + data grande + semana do tratamento */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-extrabold tracking-[-0.02em] text-ink dark:text-white">{dia}</span>
                    <span className="text-xs font-bold uppercase tracking-[.08em] text-ink-soft dark:text-white/50">
                      {mes} {ano}
                    </span>
                    {semana != null && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent dark:bg-accent-light/15 dark:text-accent-light">
                        Semana {semana}
                      </span>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>

                <div className="mt-4 space-y-0">
                  {g.eventos.map((ev, i) => {
                    const peso = pesoVisual(ev);
                    const anterior = i > 0 ? g.eventos[i - 1] : null;
                    const encadeia = anterior && pesoVisual(anterior) === 'pequeno' && peso === 'pequeno';
                    return (
                      <div key={ev.id}>
                        {encadeia && (
                          <div className="flex justify-center py-0.5">
                            <ChevronDown size={13} strokeWidth={2.5} className="text-ink-faint dark:text-white/25" />
                          </div>
                        )}
                        <EventoCard ev={ev} peso={peso} onClick={() => onAbrirEvento(ev.categoria)} espaco={!encadeia && i > 0} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {visivel < grupos.length && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <span className="text-xs text-ink-faint dark:text-white/40">Carregando mais eventos…</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function EventoCard({ ev, peso, onClick, espaco }: { ev: TimelineEvent; peso: Peso; onClick: () => void; espaco: boolean }) {
  const Icon = TIMELINE_ICON[ev.categoria];

  if (peso === 'grande') {
    return (
      <button
        onClick={onClick}
        className={`w-full rounded-lg border border-accent/25 bg-accent-gradient p-5 text-left text-white shadow-btn transition hover:brightness-[1.03] ${espaco ? 'mt-3' : ''}`}
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Icon size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-[.1em] opacity-90">Marco da jornada</span>
            </div>
            <p className="mt-0.5 text-base font-bold tracking-[-0.01em]">{ev.titulo}</p>
            <p className="mt-0.5 text-sm opacity-90">{ev.descricao}</p>
          </div>
        </div>
      </button>
    );
  }

  if (peso === 'medio') {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 text-left transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/5 dark:bg-navy-soft/60 dark:hover:border-accent-light/30 dark:hover:bg-accent-light/5 ${espaco ? 'mt-3' : ''}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light">
          <Icon size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink dark:text-white">{ev.titulo}</p>
          <p className="mt-0.5 text-[13px] text-ink-soft dark:text-white/60">{ev.descricao}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-md border border-slate-100 bg-white px-3.5 py-2.5 text-left transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/5 dark:bg-navy-soft/40 dark:hover:border-accent-light/30 dark:hover:bg-accent-light/5 ${espaco ? 'mt-3' : ''}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light">
        <Icon size={13} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink dark:text-white">{ev.titulo}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft dark:text-white/60">{ev.descricao}</p>
        {ev.insight && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent dark:text-accent-light">
            <ChevronDown size={11} strokeWidth={2.5} />
            {ev.insight}
          </p>
        )}
      </div>
    </button>
  );
}
