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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-accent-gradient-soft text-accent">
        <Icon size={24} strokeWidth={2} />
      </div>
      <h1 className="mt-6 text-xl font-bold tracking-[-0.01em] text-ink">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
