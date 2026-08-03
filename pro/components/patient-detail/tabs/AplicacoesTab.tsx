import { Syringe } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Aplicacao } from '@/lib/patient-detail';

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function diasEntre(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

export function AplicacoesTab({ aplicacoes, proximaAplicacaoDias }: { aplicacoes: Aplicacao[]; proximaAplicacaoDias: number | null }) {
  const ordenado = [...aplicacoes].reverse();

  if (ordenado.length === 0) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <Syringe size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Este paciente ainda não registrou nenhuma aplicação.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Histórico de aplicações</p>
        <p className="text-xs text-ink-faint dark:text-white/40">
          {proximaAplicacaoDias == null ? 'Sem dia fixo configurado' : proximaAplicacaoDias === 0 ? 'Próxima: hoje' : `Próxima em ${proximaAplicacaoDias} dia${proximaAplicacaoDias > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[.07em] text-ink-faint dark:border-white/5 dark:text-white/40">
              <th className="pb-2.5 pr-4 font-semibold">Data</th>
              <th className="pb-2.5 pr-4 font-semibold">Medicamento</th>
              <th className="pb-2.5 pr-4 font-semibold">Dose</th>
              <th className="pb-2.5 pr-4 font-semibold">Local</th>
              <th className="pb-2.5 font-semibold">Intervalo</th>
            </tr>
          </thead>
          <tbody>
            {ordenado.map((a, i) => {
              const anterior = ordenado[i + 1];
              const intervalo = anterior ? diasEntre(anterior.date, a.date) : null;
              return (
                <tr key={a.date + i} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                  <td className="py-2.5 pr-4 text-ink-soft dark:text-white/60">{fmtBR(a.date)}</td>
                  <td className="py-2.5 pr-4 font-medium text-ink dark:text-white">{a.medicamento || '—'}</td>
                  <td className="py-2.5 pr-4 text-ink dark:text-white">{a.dose || '—'}</td>
                  <td className="py-2.5 pr-4 text-ink-soft dark:text-white/60">{a.local || '—'}</td>
                  <td className="py-2.5 text-ink-soft dark:text-white/60">{intervalo != null ? `${intervalo} dias` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
