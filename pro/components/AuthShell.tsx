import Link from 'next/link';

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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            C
          </span>
          <span className="text-sm font-semibold text-ink">Compasso Pro</span>
        </Link>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </main>
  );
}

export function FormField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}

export function SubmitButton({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Aguarde…' : children}
    </button>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{children}</p>;
}
