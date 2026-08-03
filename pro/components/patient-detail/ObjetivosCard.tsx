import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { PatientDetail } from '@/lib/patient-detail';

function nf(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function ObjetivosCard({ p }: { p: PatientDetail }) {
  const temMeta = p.pesoInicial != null && p.pesoMeta != null;

  return (
    <Card className="animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Objetivos</p>
      {!temMeta ? (
        <p className="mt-3 text-sm text-ink-faint dark:text-white/40">Meta de peso ainda não foi definida pela paciente.</p>
      ) : (
        <div className="mt-3.5 space-y-3.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-soft dark:text-white/60">Peso inicial</span>
            <span className="font-semibold text-ink dark:text-white">{nf(p.pesoInicial!)} kg</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-soft dark:text-white/60">Meta</span>
            <span className="font-semibold text-ink dark:text-white">{nf(p.pesoMeta!)} kg</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-soft dark:text-white/60">Peso atual</span>
            <span className="font-semibold text-ink dark:text-white">{p.pesoAtual != null ? `${nf(p.pesoAtual)} kg` : '—'}</span>
          </div>
          {p.percentualMeta != null && (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs font-medium text-ink-soft dark:text-white/60">Progresso</span>
                <span className="text-xs font-bold text-accent dark:text-accent-light">{p.percentualMeta}%</span>
              </div>
              <ProgressBar value={p.percentualMeta} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
