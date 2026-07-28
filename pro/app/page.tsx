import Link from 'next/link';

/* "Página Inicial" do fluxo da Sprint 016 — só o gateway pra dentro
   do Compasso Pro (login/cadastro). Não é a landing page de marketing
   do produto (isso é landing/, outro projeto) — aqui é deliberadamente
   mínimo. */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white">
        C
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">Compasso Pro</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">
        O painel de acompanhamento clínico do Compasso, para nutricionistas e médicos.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
      >
        Entrar no Compasso Pro
      </Link>
    </main>
  );
}
