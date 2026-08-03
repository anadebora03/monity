import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/ui/LineChart';
import type { Pesagem } from '@/lib/patient-detail';

function nf(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function PesoTab({ pesagens, pesoMeta }: { pesagens: Pesagem[]; pesoMeta: number | null }) {
  const data = pesagens.map((p) => ({ x: p.date, y: p.peso }));
  const ordenado = [...pesagens].reverse();

  return (
    <div className="space-y-4">
      <Card className="animate-fade-in">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Evolução do peso</p>
        <LineChart data={data} goal={pesoMeta} unit="kg" />
      </Card>

      <Card className="animate-fade-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Histórico de pesagens</p>
        {ordenado.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nenhuma pesagem registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[.07em] text-ink-faint dark:border-white/5 dark:text-white/40">
                  <th className="pb-2.5 pr-4 font-semibold">Data</th>
                  <th className="pb-2.5 pr-4 font-semibold">Peso</th>
                  <th className="pb-2.5 font-semibold">Variação</th>
                </tr>
              </thead>
              <tbody>
                {ordenado.map((p, i) => {
                  const anterior = ordenado[i + 1];
                  const delta = anterior ? +(p.peso - anterior.peso).toFixed(1) : null;
                  return (
                    <tr key={p.date} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                      <td className="py-2.5 pr-4 text-ink-soft dark:text-white/60">{fmtBR(p.date)}</td>
                      <td className="py-2.5 pr-4 font-medium text-ink dark:text-white">{nf(p.peso)} kg</td>
                      <td className={`py-2.5 ${delta == null ? 'text-ink-faint dark:text-white/40' : delta < 0 ? 'text-good' : delta > 0 ? 'text-danger' : 'text-ink-faint dark:text-white/40'}`}>
                        {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${nf(delta)} kg`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
