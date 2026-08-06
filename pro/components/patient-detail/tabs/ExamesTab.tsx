'use client';

import { useState } from 'react';
import { FlaskConical, ChevronDown, Paperclip } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Exame } from '@/lib/patient-detail';

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ExamesTab({ exames }: { exames: Exame[] }) {
  const ordenado = [...exames].reverse();
  const [aberto, setAberto] = useState<number | null>(0);

  if (ordenado.length === 0) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <FlaskConical size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Este paciente ainda não registrou nenhum exame.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Exames laboratoriais</p>
      <div className="space-y-2">
        {ordenado.map((e, i) => {
          const open = aberto === i;
          return (
            <div key={e.date + i} className="rounded-sm border border-slate-100 dark:border-white/5">
              <button
                onClick={() => setAberto(open ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink dark:text-white">{e.tipo || 'Exame'}</p>
                  <p className="text-xs text-ink-faint dark:text-white/40">{fmtBR(e.date)}</p>
                </div>
                <ChevronDown size={16} strokeWidth={2} className={`shrink-0 text-ink-faint transition-transform duration-150 dark:text-white/40 ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="border-t border-slate-100 px-3.5 py-3 text-[13px] dark:border-white/5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-ink-soft dark:text-white/60">Resultado</span>
                    <span className="font-medium text-ink dark:text-white">{e.valor || '—'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint dark:text-white/40">
                    <Paperclip size={12} strokeWidth={2} />
                    Anexos ainda não são suportados nesta versão.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
