import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

type Tone = 'accent' | 'good' | 'warn';

const ICON_TONE: Record<Tone, string> = {
  accent: 'bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light',
  good: 'bg-good/10 text-good dark:bg-good/15',
  warn: 'bg-warn/10 text-warn dark:bg-warn/15',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'accent',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
  tone?: Tone;
}) {
  return (
    <Card className="animate-fade-in p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-xs ${ICON_TONE[tone]}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <p className="mt-2.5 text-xs font-medium text-ink-soft dark:text-white/60">{label}</p>
      <p className="mt-0.5 text-[22px] font-bold tracking-[-0.02em] text-ink dark:text-white">{value}</p>
      {caption && <p className="mt-0.5 text-[11px] text-ink-faint dark:text-white/40">{caption}</p>}
    </Card>
  );
}
