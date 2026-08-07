import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

/* "Página Inicial" do fluxo da Sprint 016 — só o gateway pra dentro
   do Monity Pro (login/cadastro). Não é a landing page de marketing
   do produto (isso é landing/, outro projeto) — aqui é deliberadamente
   mínimo. */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6 text-center dark:from-navy dark:to-navy-soft">
      <Logo size={56} />
      <h1 className="mt-6 text-3xl font-bold tracking-[-0.02em] text-ink dark:text-white">Monity Pro</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft dark:text-white/60">
        O painel de acompanhamento clínico do Monity, para nutricionistas e médicos.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-lg bg-accent-gradient px-6 py-3 text-sm font-semibold text-white shadow-btn transition hover:brightness-[1.03]"
      >
        Entrar no Monity Pro
      </Link>
    </main>
  );
}
