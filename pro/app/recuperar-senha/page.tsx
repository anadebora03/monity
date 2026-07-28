'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell, FormField, SubmitButton, ErrorText } from '@/components/AuthShell';
import { resetPasswordForEmail } from '@/lib/auth';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await resetPasswordForEmail(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <AuthShell title="Verifique seu e-mail" subtitle="">
        <p className="text-sm text-ink-soft">
          Se houver uma conta associada a <b className="text-ink">{email}</b>, você vai receber um link pra
          redefinir sua senha.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent">
          Voltar pro login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe seu e-mail e enviaremos um link pra redefinir sua senha."
      footer={
        <Link href="/login" className="font-semibold text-accent">
          Voltar pro login
        </Link>
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
        <SubmitButton loading={loading}>Enviar link</SubmitButton>
      </form>
    </AuthShell>
  );
}
