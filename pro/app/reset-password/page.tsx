'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthShell, ErrorText } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updatePassword, verifyRecoveryToken } from '@/lib/auth';

/* Tela de definir nova senha, aberta a partir do link de recuperação
   enviado por e-mail (resetPasswordForEmail() em pro/lib/auth.ts
   aponta redirectTo pra cá, com um salto opcional pela raiz — ver
   pro/app/page.tsx, que cobre o caso do Supabase ignorar o
   redirectTo por falta de Redirect URL cadastrada).

   AUTH-RESET-01, causa raiz real: o link padrão do Supabase gera um
   `code` PKCE que só pode ser trocado por sessão no MESMO navegador
   que chamou resetPasswordForEmail() — abrir o e-mail em outro
   aparelho (pedir no computador, abrir no celular, o caso mais comum
   de todos) quebra a troca na hora. Trocamos o template de e-mail
   (Supabase, Authentication -> Email Templates -> Reset Password)
   pra usar token_hash em vez do link padrão — verifyOtp() com
   token_hash não depende de nada salvo no navegador de origem,
   funciona em qualquer dispositivo. */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [prontoParaTrocar, setProntoParaTrocar] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    if (!tokenHash) {
      setLinkInvalido(true);
      return;
    }
    verifyRecoveryToken(tokenHash).then((res) => {
      if (res.ok) setProntoParaTrocar(true);
      else setLinkInvalido(true);
    });
  }, [searchParams]);

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
