import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

/* "Página Inicial" do fluxo da Sprint 016 — só o gateway pra dentro
   do Monity Pro (login/cadastro). Não é a landing page de marketing
   do produto (isso é landing/, outro projeto) — aqui é deliberadamente
   mínimo.

   Rede de segurança pro fluxo de recuperação de senha: quando
   /reset-password não está (ainda) cadastrado nas Redirect URLs do
   Supabase, ele ignora nosso redirectTo e manda o usuário pra cá (a
   Site URL) mesmo assim, só que com ?code=... anexado — é o próprio
   Supabase confirmando que o link era válido, só o destino que saiu
   errado. Sem isso, a pessoa cai numa "página inicial" sem contexto
   nenhum e nunca chega em lugar nenhum útil. Reencaminhar preserva o
   code pro /reset-password processar exatamente como seria se o
   redirectTo tivesse funcionado — mesmo mecanismo (troca de sessão no
   client via onAuthStateChange), só chegando um passo depois.

   Limitação conhecida, documentada e não escondida: um convite de
   profissional (Eduzz, admin.inviteUserByEmail sem redirectTo próprio)
   também chega aqui com ?code=. Hoje isso não é usado em produção
   (subscription_products ainda vazia) — quando for, revisar se precisa
   diferenciar os dois casos (ex.: checar o evento disparado no client,
   não só a presença do parâmetro). */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (code) {
    redirect(`/reset-password?code=${encodeURIComponent(code)}`);
  }

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
