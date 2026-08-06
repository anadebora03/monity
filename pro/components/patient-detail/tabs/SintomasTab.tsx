import { Frown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { RegistroSintomas } from '@/lib/patient-detail';

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function SintomasTab({ sintomas }: { sintomas: RegistroSintomas[] }) {
  const ordenado = [...sintomas].reverse();

  if (ordenado.length === 0) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <Frown size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Este paciente ainda não registrou nenhum sintoma.</p>
        </div>
      </Card>
    );
  }

  const contagem = new Map<string, number>();
  ordenado.forEach((r) => r.sintomas.forEach((s) => contagem.set(s, (contagem.get(s) ?? 0) + 1)));
  const recorrentes = new Set([...contagem.entries()].filter(([, n]) => n >= 3).map(([s]) => s));

  return (
    <Card className="animate-fade-in">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Sintomas registrados</p>
      {recorrentes.size > 0 && (
        <p className="mb-3 text-[13px] text-warn">
          Recorrente{recorrentes.size > 1 ? 's' : ''}: {[...recorrentes].map((s) => `${s} (${contagem.get(s)}×)`).join(', ')}
        </p>
      )}
      <ul className="space-y-3">
        {ordenado.map((r, i) => (
          <li key={r.date + i} className="flex flex-wrap items-center gap-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0 dark:border-white/5">
            <span className="text-xs text-ink-faint dark:text-white/40">{fmtBR(r.date)}</span>
            {r.sintomas.map((s) => (
              <Badge key={s} tone={recorrentes.has(s) ? 'warn' : 'neutral'}>
                {s}
              </Badge>
            ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}
