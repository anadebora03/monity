import { Flag, Syringe, RefreshCw, Pill, Scale, Activity, FlaskConical, Frown, Trophy, ClipboardList, Stethoscope, CalendarCheck, FileText, UserPlus, UserCheck, MapPin } from 'lucide-react';
import type { TimelineEvent } from '@/lib/patient-detail';

export const TIMELINE_ICON: Record<TimelineEvent['categoria'], typeof Flag> = {
  cadastro: UserPlus,
  convite: UserCheck,
  tratamento: Flag,
  aplicacao: Syringe,
  dose: RefreshCw,
  medicamento: Pill,
  peso: Scale,
  bioimpedancia: Activity,
  exame: FlaskConical,
  sintomas: Frown,
  conquista: Trophy,
  plano: ClipboardList,
  consulta: Stethoscope,
  retorno: CalendarCheck,
  relatorio: FileText,
};

export function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function TimelineList({ eventos, limite }: { eventos: TimelineEvent[]; limite?: number }) {
  const lista = limite ? eventos.slice(0, limite) : eventos;

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <MapPin size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
        <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Este paciente ainda não tem nenhum evento registrado.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {lista.map((ev, i) => {
        const Icon = TIMELINE_ICON[ev.categoria];
        const isLast = i === lista.length - 1;
        return (
          <li key={ev.id} className="relative flex animate-fade-in gap-3.5 pb-6 last:pb-0" style={{ animationDelay: `${i * 30}ms` }}>
            {!isLast && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-slate-100 dark:bg-white/10" />}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light">
              <Icon size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-[13px] font-semibold text-ink dark:text-white">{ev.titulo}</p>
                <span className="text-xs text-ink-faint dark:text-white/40">{fmtBR(ev.data)}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-soft dark:text-white/60">{ev.descricao}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
