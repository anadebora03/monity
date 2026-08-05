'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { AlertaClinico } from '@/lib/agenda-data';

export function AlertasClinicos({ alertas }: { alertas: AlertaClinico[] }) {
  const router = useRouter();

  return (
    <Card className="animate-fade-in">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Necessitam atenção</p>
      {alertas.length === 0 ? (
        <div className="flex items-center gap-2.5 py-2">
          <ShieldCheck size={18} strokeWidth={2} className="text-good" />
          <p className="text-sm text-ink-soft dark:text-white/60">Nenhum alerta clínico agora.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {alertas.map((a, i) => (
            <li
              key={i}
              onClick={() => a.patientId && router.push(`/pro/pacientes/${a.patientId}`)}
              className={`flex items-start gap-2.5 rounded-sm border p-2.5 text-[13px] ${a.patientId ? 'cursor-pointer' : ''} ${
                a.tom === 'danger' ? 'border-danger/15 bg-danger/5 dark:border-danger/20 dark:bg-danger/10' : 'border-warn/15 bg-warn/5 dark:border-warn/20 dark:bg-warn/10'
              }`}
            >
              <AlertTriangle size={14} strokeWidth={2} className={`mt-0.5 shrink-0 ${a.tom === 'danger' ? 'text-danger' : 'text-warn'}`} />
              <span className="text-ink dark:text-white">{a.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
