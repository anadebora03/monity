import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/ui/LineChart';
import type { BioRegistro } from '@/lib/patient-detail';

/* Mesmo catálogo BIOM de app.js (bioView) — só reflete o que o
   paciente já registra hoje. */
const CAMPOS: { key: keyof BioRegistro; label: string; un: string }[] = [
  { key: 'gordura', label: 'Gordura corporal', un: '%' },
  { key: 'massaMagraPct', label: 'Massa muscular', un: '%' },
  { key: 'musculo', label: 'Massa muscular', un: 'kg' },
  { key: 'agua', label: 'Água corporal', un: '%' },
  { key: 'visceral', label: 'Gordura visceral', un: '' },
  { key: 'tmb', label: 'Metabolismo basal', un: 'kcal' },
];

function nf(n: number, un: string) {
  return un === 'kcal' ? n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function BioimpedanciaTab({ registros }: { registros: BioRegistro[] }) {
  if (registros.length === 0) {
    return (
      <Card className="animate-fade-in">
        <div className="flex flex-col items-center py-10 text-center">
          <Activity size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Este paciente ainda não registrou nenhuma bioimpedância.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {CAMPOS.map((c) => {
        const serie = registros.filter((r) => r[c.key] != null).map((r) => ({ x: r.date, y: r[c.key] as number }));
        const ultimo = serie.length ? serie[serie.length - 1].y : null;
        return (
          <Card key={c.key} className="animate-fade-in">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">{c.label}</p>
              <p className="text-sm font-bold text-ink dark:text-white">{ultimo != null ? `${nf(ultimo, c.un)}${c.un ? ' ' + c.un : ''}` : '—'}</p>
            </div>
            {serie.length >= 2 ? (
              <LineChart data={serie} unit={c.un} />
            ) : (
              <p className="py-8 text-center text-[13px] text-ink-faint dark:text-white/40">Registre mais medições para ver a evolução.</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
