'use client';

import { CalendarDays, Compass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CompromissoPaciente } from '@/lib/patient-detail';

const STATUS_LABEL: Record<string, { label: string; tone: 'neutral' | 'accent' | 'good' | 'danger' | 'warn' }> = {
  agendado: { label: 'Agendado', tone: 'accent' },
  confirmado: { label: 'Confirmado', tone: 'accent' },
  realizado: { label: 'Realizado', tone: 'good' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
  reagendado: { label: 'Reagendado', tone: 'warn' },
};

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Linha({ c }: { c: CompromissoPaciente }) {
  const st = STATUS_LABEL[c.status] ?? { label: c.status, tone: 'neutral' as const };
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 rounded-sm border border-slate-100 p-3 dark:border-white/5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink dark:text-white">{c.tipo}</p>
        <p className="mt-0.5 text-xs text-ink-faint dark:text-white/40">
          {fmtBR(c.data)}
          {c.hora ? ` às ${c.hora.slice(0, 5)}` : ''}
        </p>
        {c.observacoes && <p className="mt-1 text-[13px] text-ink-soft dark:text-white/60">{c.observacoes}</p>}
      </div>
      <Badge tone={st.tone}>{st.label}</Badge>
    </li>
  );
}

export function AgendaPatientTab({ compromissos }: { compromissos: CompromissoPaciente[] }) {
  const hoje = todayISO();
  const proximos = compromissos.filter((c) => c.data >= hoje && c.status !== 'cancelado').sort((a, b) => (a.data < b.data ? -1 : 1));
  const historico = compromissos.filter((c) => c.data < hoje || c.status === 'cancelado').sort((a, b) => (a.data < b.data ? 1 : -1));

  if (compromissos.length === 0) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <Compass size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Nenhum compromisso registrado para este paciente ainda.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="animate-fade-in">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <CalendarDays size={13} strokeWidth={2} />
          Próximos compromissos
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nenhum compromisso agendado.</p>
        ) : (
          <ul className="space-y-2">
            {proximos.map((c) => (
              <Linha key={c.id} c={c} />
            ))}
          </ul>
        )}
      </Card>

      <Card className="animate-fade-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Histórico</p>
        {historico.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nenhum compromisso passado.</p>
        ) : (
          <ul className="space-y-2">
            {historico.map((c) => (
              <Linha key={c.id} c={c} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
