import { Ruler } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/ui/LineChart';
import type { Pesagem } from '@/lib/patient-detail';

/* O schema do app do paciente só guarda cintura/quadril/abdomen/
   coxa/braco (weighings) — não existe coluna "peito", então não
   inventamos essa medida aqui (mesmo princípio de não fabricar dado
   já aplicado em idade/sexo/foto no cabeçalho). */
const MEDIDAS: { key: keyof Pesagem; label: string }[] = [
  { key: 'cintura', label: 'Cintura' },
  { key: 'quadril', label: 'Quadril' },
  { key: 'abdomen', label: 'Abdômen' },
  { key: 'coxa', label: 'Coxa' },
  { key: 'braco', label: 'Braço' },
];

function nf(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function MedidasTab({ pesagens }: { pesagens: Pesagem[] }) {
  const comAlgumaMedida = pesagens.some((p) => MEDIDAS.some((m) => p[m.key] != null));

  if (!comAlgumaMedida) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <Ruler size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Este paciente ainda não registrou medidas corporais.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {MEDIDAS.map((m) => {
        const serie = pesagens.filter((p) => p[m.key] != null).map((p) => ({ x: p.date, y: p[m.key] as number }));
        const ultimo = serie.length ? serie[serie.length - 1].y : null;
        return (
          <Card key={m.key} className="animate-fade-in">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">{m.label}</p>
              <p className="text-sm font-bold text-ink dark:text-white">{ultimo != null ? `${nf(ultimo)} cm` : '—'}</p>
            </div>
            {serie.length >= 2 ? (
              <LineChart data={serie} unit="cm" />
            ) : (
              <p className="py-8 text-center text-[13px] text-ink-faint dark:text-white/40">Registre mais medidas para ver a evolução.</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
