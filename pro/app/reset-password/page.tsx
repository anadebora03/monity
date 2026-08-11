'use client';

import { useEffect, useState } from 'react';
import { AuthShell, ErrorText } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updatePassword } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

/* Tela de definir nova senha, aberta a partir do link de recuperação
   enviado por e-mail (resetPasswordForEmail() em pro/lib/auth.ts
   aponta redirectTo pra cá). O client Supabase (@supabase/ssr,
   detectSessionInUrl padrão) troca o `code`/token da URL pela sessão
   de recuperação automaticamente ao montar — o evento
   PASSWORD_RECOVERY é o sinal de que isso já aconteceu. Ouvir esse
   evento explicitamente (em vez de só confiar que updateUser() vai
   funcionar) permite avisar quando o link está expirado/inválido,
   em vez de deixar o usuário preencher o formulário pra só então
   descobrir que não tinha sessão nenhuma. */
export default function ResetPasswordPage() {
  const [prontoParaTrocar, setProntoParaTrocar] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Nunca redirecionar pra /login aqui — este evento É o sinal de
      // que o usuário está no meio do fluxo de recuperação, exatamente
      // o comportamento que a sprint pediu pra garantir.
      if (event === 'PASSWORD_RECOVERY') setProntoParaTrocar(true);
    });

    // Se depois de um tempo razoável o evento nunca chegou, o link já
    // tinha expirado ou foi usado antes — mensagem honesta em vez de
    // deixar o formulário parado sem explicação.
    const timeout = setTimeout(() => {
      setProntoParaTrocar((atual) => {
        if (!atual) setLinkInvalido(true);
        return atual;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

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
