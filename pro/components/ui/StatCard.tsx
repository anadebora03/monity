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
    <Card className="animate-fade-in p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${ICON_TONE[tone]}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <p className="mt-4 text-[13px] font-medium text-ink-soft dark:text-white/60">{label}</p>
      <p className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-ink dark:text-white">{value}</p>
      {caption && <p className="mt-1 text-xs text-ink-faint dark:text-white/40">{caption}</p>}
    </Card>
  );
}
