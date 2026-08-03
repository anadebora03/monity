import { Scale, TrendingDown, TrendingUp, Target, Syringe, Ruler, CalendarDays } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import type { PatientDetail } from '@/lib/patient-detail';

function nf(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function StatsGrid({ p }: { p: PatientDetail }) {
  const variacao = p.variacaoTotal;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard icon={Scale} label="Peso atual" value={p.pesoAtual != null ? `${nf(p.pesoAtual)} kg` : '—'} />
      <StatCard
        icon={variacao != null && variacao >= 0 ? TrendingDown : TrendingUp}
        label="Variação total"
        tone={variacao != null && variacao > 0 ? 'good' : 'accent'}
        value={variacao != null ? `${variacao >= 0 ? '−' : '+'}${nf(Math.abs(variacao))} kg` : '—'}
      />
      <StatCard icon={Target} label="Meta" value={p.percentualMeta != null ? `${p.percentualMeta}%` : '—'} caption={p.pesoMeta != null ? `${nf(p.pesoMeta)} kg` : undefined} />
      <StatCard
        icon={Syringe}
        label="Próxima aplicação"
        value={p.proximaAplicacaoDias == null ? '—' : p.proximaAplicacaoDias === 0 ? 'Hoje' : p.proximaAplicacaoDias === 1 ? 'Amanhã' : `Em ${p.proximaAplicacaoDias} dias`}
      />
      <StatCard icon={Ruler} label="IMC" value={p.imc != null ? nf(p.imc) : '—'} />
      <StatCard icon={CalendarDays} label="Dias de tratamento" value={p.diasTratamento ?? '—'} />
    </div>
  );
}
