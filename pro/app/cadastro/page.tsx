'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell, ErrorText } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signUp } from '@/lib/auth';

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (senha !== confirmacao) {
      setError('As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    // nome vai como user_metadata pra já existir quando o onboarding
    // criar professional_profiles — evita pedir o nome de novo.
    const res = await signUp(email, senha, { nome });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.precisaConfirmarEmail) {
      setConfirmarEmail(true);
      return;
    }
    router.push('/onboarding');
    router.refresh();
  }

  if (confirmarEmail) {
    return (
      <AuthShell title="Confirme seu e-mail" subtitle="Falta pouco.">
        <p className="text-sm text-ink-soft">
          Mandamos um link de confirmação para <b className="text-ink">{email}</b>. Abra o e-mail e clique no
          link pra continuar seu cadastro no Monity Pro.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Leva menos de um minuto — o resto a gente configura pra você."
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-accent">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <Input label="Nome completo" required value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Input
          label="Confirmação da senha"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Aguarde…' : 'Criar conta'}
        </Button>
      </form>
    </AuthShell>
  );
}
