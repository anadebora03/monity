'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, CalendarX2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarMonth } from '@/components/agenda/CalendarMonth';
import { DayTimeline } from '@/components/agenda/DayTimeline';
import { AgendaSidebar } from '@/components/agenda/AgendaSidebar';
import { AlertasClinicos } from '@/components/agenda/AlertasClinicos';
import { NovoCompromissoModal } from '@/components/agenda/NovoCompromissoModal';
import { createClient } from '@/lib/supabase/client';
import { listarCompromissos, type Compromisso, type AgendaStats, type PacienteSemAtualizacao, type ProximaAplicacao, type AlertaClinico } from '@/lib/agenda-data';
import { CalendarDays, RefreshCw, UserX, ClipboardList } from 'lucide-react';

const DIAS_SEMANA_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function primeiroDiaMes(ano: number, mes: number) {
  return `${ano}-${pad(mes + 1)}-01`;
}
function ultimoDiaMes(ano: number, mes: number) {
  const d = new Date(ano, mes + 1, 0);
  return toISO(d);
}
function inicioSemana(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d;
}

type ModoVisao = 'mes' | 'semana' | 'dia';

export function AgendaView({
  workspaceId,
  initialCompromissos,
  semAtualizacao,
  aplicacoesHoje,
  retornos,
  alertas,
  stats,
}: {
  workspaceId: string;
  initialCompromissos: Compromisso[];
  semAtualizacao: PacienteSemAtualizacao[];
  aplicacoesHoje: ProximaAplicacao[];
  retornos: Compromisso[];
  alertas: AlertaClinico[];
  stats: AgendaStats;
}) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [selecionado, setSelecionado] = useState(toISO(hoje));
  const [modo, setModo] = useState<ModoVisao>('mes');
  const [compromissos, setCompromissos] = useState<Compromisso[]>(initialCompromissos);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    listarCompromissos(supabase, primeiroDiaMes(ano, mes), ultimoDiaMes(ano, mes)).then(setCompromissos);
  }, [ano, mes]);

  function recarregar() {
    const supabase = createClient();
    listarCompromissos(supabase, primeiroDiaMes(ano, mes), ultimoDiaMes(ano, mes)).then(setCompromissos);
  }

  const diasComEventos = useMemo(() => new Set(compromissos.map((c) => c.data)), [compromissos]);

  const compromissosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return compromissos;
    return compromissos.filter((c) => (c.patientNome || c.titulo || '').toLowerCase().includes(q) || c.tipo.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) || c.data.includes(q));
  }, [busca, compromissos]);

  const compromissosDoDia = compromissosFiltrados.filter((c) => c.data === selecionado);

  const diasDaSemana = useMemo(() => {
    const inicio = inicioSemana(selecionado);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return toISO(d);
    });
  }, [selecionado]);

  const cabecalhoTexto = `Hoje é ${DIAS_SEMANA_LONGO[hoje.getDay()]}, ${hoje.getDate()} de ${MESES_LONGO[hoje.getMonth()]}.`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">Agenda</h1>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">{cabecalhoTexto}</p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus size={16} strokeWidth={2} />
          Novo compromisso
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={CalendarDays} label="Consultas hoje" value={stats.consultasHoje} />
        <StatCard icon={RefreshCw} label="Retornos" value={stats.retornosProximos} />
        <StatCard icon={UserX} label="Sem atualização" value={stats.pacientesSemAtualizacao} tone={stats.pacientesSemAtualizacao > 0 ? 'warn' : 'accent'} />
        <StatCard icon={ClipboardList} label="Tarefas pendentes" value={stats.tarefasPendentes} tone={stats.tarefasPendentes > 0 ? 'warn' : 'accent'} />
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-white/40" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por paciente, tipo, status ou data…"
          className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-border-dark dark:bg-navy-soft dark:text-white dark:placeholder:text-white/30"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-1 rounded-sm bg-slate-50 p-1 dark:bg-white/5">
                {(['mes', 'semana', 'dia'] as ModoVisao[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModo(m)}
                    className={`rounded-sm px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-150 ${
                      modo === m ? 'bg-white text-ink shadow-sm dark:bg-navy-soft dark:text-white' : 'text-ink-faint dark:text-white/40'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {modo === 'mes' && (
              <>
                <CalendarMonth
                  ano={ano}
                  mes={mes}
                  selecionado={selecionado}
                  diasComEventos={diasComEventos}
                  onSelecionar={setSelecionado}
                  onMesChange={(a, m) => {
                    setAno(a);
                    setMes(m);
                  }}
                />
                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
                    {new Date(selecionado + 'T00:00:00').getDate()} de {MESES_LONGO[new Date(selecionado + 'T00:00:00').getMonth()]}
                  </p>
                  <DayTimeline compromissos={compromissosDoDia} />
                </div>
              </>
            )}

            {modo === 'semana' && (
              <div className="space-y-4">
                {diasDaSemana.map((iso) => (
                  <div key={iso}>
                    <button onClick={() => { setSelecionado(iso); setModo('dia'); }} className="mb-2 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint hover:text-accent dark:text-white/40 dark:hover:text-accent-light">
                      {DIAS_SEMANA_LONGO[new Date(iso + 'T00:00:00').getDay()]} · {iso.split('-').reverse().slice(0, 2).join('/')}
                    </button>
                    <DayTimeline compromissos={compromissosFiltrados.filter((c) => c.data === iso)} />
                  </div>
                ))}
              </div>
            )}

            {modo === 'dia' && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
                  {DIAS_SEMANA_LONGO[new Date(selecionado + 'T00:00:00').getDay()]}, {new Date(selecionado + 'T00:00:00').getDate()} de {MESES_LONGO[new Date(selecionado + 'T00:00:00').getMonth()]}
                </p>
                <DayTimeline compromissos={compromissosDoDia} />
              </div>
            )}

            {compromissos.length === 0 && (
              <div className="mt-2">
                <EmptyState
                  icon={CalendarX2}
                  title="Sua agenda está livre"
                  description="Aproveite para acompanhar seus pacientes."
                  action={
                    <Button onClick={() => setModalAberto(true)}>
                      <Plus size={16} strokeWidth={2} />
                      Novo compromisso
                    </Button>
                  }
                />
              </div>
            )}
          </Card>

          <AlertasClinicos alertas={alertas} />
        </div>

        <AgendaSidebar semAtualizacao={semAtualizacao} aplicacoesHoje={aplicacoesHoje} retornos={retornos} />
      </div>

      <NovoCompromissoModal open={modalAberto} onClose={() => setModalAberto(false)} workspaceId={workspaceId} defaultData={selecionado} onCreated={recarregar} />
    </div>
  );
}
