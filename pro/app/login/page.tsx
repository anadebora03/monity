'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell, FormField, SubmitButton, ErrorText } from '@/components/AuthShell';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push('/pro');
    router.refresh();
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse seu painel de acompanhamento clínico."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="font-semibold text-accent">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorText>{error}</ErrorText>
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right">
          <Link href="/recuperar-senha" className="text-sm text-accent">
            Esqueci minha senha
          </Link>
        </div>
        <SubmitButton loading={loading}>Entrar</SubmitButton>
      </form>
    </AuthShell>
  );
}
