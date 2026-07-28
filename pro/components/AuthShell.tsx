import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-sm font-semibold tracking-[-0.005em] text-ink">Compasso Pro</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </main>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="mb-4 rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{children}</p>;
}
