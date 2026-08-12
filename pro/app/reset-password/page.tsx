'use client';

import { Suspense, useState } from 'react';
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

   AUTH-RESET-01: template de e-mail usa token_hash (verifyOtp) em vez
   do `code` PKCE padrão do Supabase, porque o code fica preso ao
   navegador que pediu a recuperação (quebra ao abrir em outro
   aparelho). token_hash funciona em qualquer navegador — MAS é de uso
   único, e por isso não pode ser consumido automaticamente ao
   carregar a página: muitos provedores de e-mail (Microsoft 365 "Safe
   Links", alguns webmails) pré-visitam todo link do e-mail pra
   escanear segurança ANTES do clique real da pessoa — se
   verifyRecoveryToken() rodasse sozinho num useEffect ao montar, esse
   "clique robô" consumiria o token antes do usuário nunca ver a tela.
   Um scanner automatizado faz um GET simples na página e não clica em
   botões — por isso o consumo do token fica atrás de um clique
   explícito ("Continuar"), não do carregamento da página. */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');

  const [confirmando, setConfirmando] = useState(false);
  const [prontoParaTrocar, setProntoParaTrocar] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(!tokenHash);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function confirmarLink() {
    if (!tokenHash) return;
    setConfirmando(true);
    const res = await verifyRecoveryToken(tokenHash);
    setConfirmando(false);
    if (res.ok) setProntoParaTrocar(true);
    else setLinkInvalido(true);
  }

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

  if (!prontoParaTrocar) {
    return (
      <AuthShell title="Redefinir senha" subtitle="Confirme para continuar com a redefinição da sua senha.">
        <Button onClick={confirmarLink} disabled={confirmando} className="w-full">
          {confirmando ? 'Confirmando…' : 'Continuar'}
        </Button>
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
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando…' : 'Redefinir senha'}
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
