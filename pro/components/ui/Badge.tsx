type Tone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  accent: 'bg-accent/10 text-accent dark:bg-accent-light/15 dark:text-accent-light',
  good: 'bg-good/10 text-good dark:bg-good/15',
  warn: 'bg-warn/10 text-warn dark:bg-warn/15',
  danger: 'bg-danger/10 text-danger dark:bg-danger/15',
  neutral: 'bg-slate-100 text-ink-soft dark:bg-white/5 dark:text-white/60',
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
