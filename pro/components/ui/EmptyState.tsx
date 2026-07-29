import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] animate-fade-in flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light">
        <Icon size={24} strokeWidth={2} />
      </div>
      <h1 className="mt-6 text-xl font-bold tracking-[-0.01em] text-ink dark:text-white">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft dark:text-white/60">{description}</p>
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
