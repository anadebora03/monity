import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

type Tone = 'accent' | 'good' | 'warn';

const ICON_TONE: Record<Tone, string> = {
  accent: 'bg-accent-gradient-soft text-accent',
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/10 text-warn',
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
    <Card className="p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${ICON_TONE[tone]}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <p className="mt-4 text-[13px] font-medium text-ink-soft">{label}</p>
      <p className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-ink">{value}</p>
      {caption && <p className="mt-1 text-xs text-ink-faint">{caption}</p>}
    </Card>
  );
}
