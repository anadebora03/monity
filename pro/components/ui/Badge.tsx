type Tone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  accent: 'bg-accent/10 text-accent',
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-slate-100 text-ink-soft',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-[-0.005em] ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
