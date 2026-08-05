'use client';

import { Stethoscope, RefreshCw, Activity, ClipboardCheck, Video, CalendarDays, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Compromisso, StatusCompromisso } from '@/lib/agenda-data';

const TIPO_ICON: Record<string, typeof Stethoscope> = {
  'Consulta Inicial': Stethoscope,
  Retorno: RefreshCw,
  Bioimpedância: Activity,
  Avaliação: ClipboardCheck,
  Teleconsulta: Video,
  Outro: CalendarDays,
};

const STATUS_LABEL: Record<StatusCompromisso, { label: string; tone: 'good' | 'warn' | 'neutral' | 'danger' | 'accent' }> = {
  agendado: { label: 'Agendado', tone: 'neutral' },
  confirmado: { label: 'Confirmado', tone: 'accent' },
  realizado: { label: 'Realizado', tone: 'good' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
  reagendado: { label: 'Reagendado', tone: 'warn' },
};

export function DayTimeline({ compromissos, onClickCompromisso }: { compromissos: Compromisso[]; onClickCompromisso?: (c: Compromisso) => void }) {
  if (compromissos.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Clock size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
        <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Nenhum compromisso neste dia.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {compromissos.map((c) => {
        const Icon = TIPO_ICON[c.tipo] || CalendarDays;
        const st = STATUS_LABEL[c.status];
        return (
          <li
            key={c.id}
            onClick={() => onClickCompromisso?.(c)}
            className="flex animate-fade-in cursor-pointer items-center gap-3 rounded-sm border border-slate-100 p-3 transition-colors duration-150 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
          >
            <div className="w-12 shrink-0 text-center">
              <p className="text-[13px] font-bold text-ink dark:text-white">{c.hora ? c.hora.slice(0, 5) : '—'}</p>
            </div>
            <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light">
              <Icon size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink dark:text-white">{c.patientNome || c.titulo || 'Compromisso'}</p>
              <p className="truncate text-xs text-ink-faint dark:text-white/40">
                {c.tipo} · {c.duracaoMin} min
              </p>
            </div>
            <Badge tone={st.tone === 'accent' ? 'accent' : st.tone}>{st.label}</Badge>
          </li>
        );
      })}
    </ol>
  );
}
