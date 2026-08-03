import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function InsightsClinicos({ insights }: { insights: string[] }) {
  return (
    <Card className="animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Insights clínicos</p>
      {insights.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint dark:text-white/40">Ainda não há dados suficientes para gerar insights.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {insights.map((texto, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-ink dark:text-white">
              <Sparkles size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-accent dark:text-accent-light" />
              {texto}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
