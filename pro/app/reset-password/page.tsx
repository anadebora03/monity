'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthShell, ErrorText } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updatePassword } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

/* Tela de definir nova senha, aberta a partir do link de recuperação
   enviado por e-mail (resetPasswordForEmail() em pro/lib/auth.ts
   aponta redirectTo pra cá, com um salto opcional pela raiz — ver
   pro/app/page.tsx). O client Supabase (@supabase/ssr,
   detectSessionInUrl padrão) troca o `code`/token da URL pela sessão
   de recuperação automaticamente ao montar.

   Corrida de verdade encontrada em produção: quando essa troca
   termina ANTES deste componente terminar de montar e assinar
   onAuthStateChange, o evento PASSWORD_RECOVERY já disparou e nunca
   chega até o listener — a página achava (errado) que o link tinha
   expirado, mesmo com a troca já concluída com sucesso. Corrigido
   checando getSession() imediatamente ao montar (cobre "já
   aconteceu") E continuando a ouvir onAuthStateChange (cobre "está
   prestes a acontecer") — qualquer um dos dois libera o formulário.

   Desde a troca pro fluxo /auth/confirm (verifyOtp por token_hash, ver
   pro/app/auth/confirm/route.ts), a sessão já chega pronta via cookie
   ANTES desta página carregar — o getSession() abaixo já é suficiente
   na maioria dos casos; o listener de PASSWORD_RECOVERY fica como
   rede de segurança pro caso raro de o cookie ainda não ter
   propagado. ?erro=link_invalido (redirect explícito de
   /auth/confirm quando verifyOtp falha) pula direto pro estado de
   erro, sem esperar o timeout. */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [prontoParaTrocar, setProntoParaTrocar] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(searchParams.get('erro') === 'link_invalido');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (linkInvalido) return;
    const supabase = createClient();
    let liberado = false;

    function liberar() {
      liberado = true;
      setProntoParaTrocar(true);
    }

    // Cobre o caso em que a troca do code já terminou antes deste
    // efeito rodar — a sessão já existe, então nunca vamos ver o
    // evento PASSWORD_RECOVERY disparar (ele já disparou).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) liberar();
    });

    // Cobre o caso em que a troca ainda está em andamento quando este
    // efeito roda — nunca redirecionar pra /login aqui, este evento É
    // o sinal de que o usuário está no meio do fluxo de recuperação.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) liberar();
    });

    // Se depois de um tempo razoável nada dos dois acima liberou o
    // formulário, o link já tinha expirado ou foi usado antes —
    // mensagem honesta em vez de deixar o formulário parado sem
    // explicação.
    const timeout = setTimeout(() => {
      if (!liberado) setLinkInvalido(true);
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [linkInvalido]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!senha || !confirmar) {
      setError('Preencha a nova senha e a confirmação.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const res = await updatePassword(senha);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSucesso(true);
  }

  if (sucesso) {
    return (
      <AuthShell title="Senha redefinida com sucesso!" subtitle="Sua senha foi atualizada. Você já pode acessar o Monity Pro.">
        <a href="/pro">
          <Button className="w-full">Entrar no Monity Pro</Button>
        </a>
      </AuthShell>
    );
  }

  if (linkInvalido) {
    return (
      <AuthShell title="Link inválido ou expirado" subtitle="Peça um novo link de recuperação de senha.">
        <a href="/recuperar-senha">
          <Button className="w-full">Solicitar novo link</Button>
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Redefinir senha" subtitle="Crie uma nova senha para acessar sua conta Monity Pro.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          disabled={!prontoParaTrocar}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          disabled={!prontoParaTrocar}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        <Button type="submit" disabled={loading || !prontoParaTrocar} className="w-full">
          {loading ? 'Salvando…' : !prontoParaTrocar ? 'Confirmando link…' : 'Redefinir senha'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
