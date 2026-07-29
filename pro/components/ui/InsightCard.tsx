import { Sparkles, AlertTriangle } from 'lucide-react';

export function InsightCard({ titulo, texto, tom }: { titulo: string; texto: string; tom: 'good' | 'warn' }) {
  const Icon = tom === 'good' ? Sparkles : AlertTriangle;
  return (
    <div
      className={`flex gap-3 rounded-sm border p-3.5 ${
        tom === 'good'
          ? 'border-good/15 bg-good/5 dark:border-good/20 dark:bg-good/10'
          : 'border-warn/15 bg-warn/5 dark:border-warn/20 dark:bg-warn/10'
      }`}
    >
      <Icon size={16} strokeWidth={2} className={`mt-0.5 shrink-0 ${tom === 'good' ? 'text-good' : 'text-warn'}`} />
      <div>
        <p className="text-[13px] font-semibold text-ink dark:text-white">{titulo}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-soft dark:text-white/60">{texto}</p>
      </div>
    </div>
  );
}
