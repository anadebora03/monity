'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Stethoscope } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { signIn, signUp } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

const APP_PACIENTE_URL = 'https://monityapp.vercel.app';

type Preview = {
  status: 'pending' | 'active' | 'declined' | 'ended';
  profissional_nome: string | null;
  profissao_nome: string | null;
  workspace_nome: string | null;
} | null;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-navy">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>
        {children}
      </div>
    </main>
  );
}

export function InviteFlow({ code, preview, jaAutenticado }: { code: string; preview: Preview; jaAutenticado: boolean }) {
  const [step, setStep] = useState<'auth' | 'confirm' | 'accepted' | 'declined'>(
    jaAutenticado ? 'confirm' : 'auth'
  );
  const [modo, setModo] = useState<'entrar' | 'criar'>('criar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  if (!preview) {
    return (
      <Shell>
        <Card className="text-center">
          <XCircle size={32} className="mx-auto text-danger" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">Convite não encontrado</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Verifique se o link está completo e correto.</p>
        </Card>
      </Shell>
    );
  }

  if (preview.status === 'active') {
    return (
      <Shell>
        <Card className="text-center">
          <CheckCircle2 size={32} className="mx-auto text-good" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">Este convite já foi aceito</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">O vínculo já está ativo — é só usar o app do Monity normalmente.</p>
          <a href={APP_PACIENTE_URL} className="mt-4 inline-block">
            <Button>Abrir o Monity</Button>
          </a>
        </Card>
      </Shell>
    );
  }

  if (preview.status === 'declined' || preview.status === 'ended') {
    return (
      <Shell>
        <Card className="text-center">
          <XCircle size={32} className="mx-auto text-ink-faint dark:text-white/30" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">Este convite não está mais disponível</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Peça ao profissional pra enviar um novo convite.</p>
        </Card>
      </Shell>
    );
  }

  async function aceitar() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('redeem_workspace_invite', { p_code: code });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message.includes('já está vinculado') ? rpcError.message : 'Não foi possível aceitar o convite. Tente novamente.');
      return;
    }
    setStep('accepted');
  }

  async function recusar() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('decline_workspace_invite', { p_code: code });
    setLoading(false);
    if (rpcError) {
      setError('Não foi possível recusar o convite. Tente novamente.');
      return;
    }
    setStep('declined');
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = modo === 'criar' ? await signUp(email, senha, { nome }) : await signIn(email, senha);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (modo === 'criar' && 'precisaConfirmarEmail' in res && res.precisaConfirmarEmail) {
      setConfirmarEmail(true);
      return;
    }
    setStep('confirm');
  }

  const profissional = preview.profissional_nome || 'Seu profissional';

  return (
    <Shell>
      {step === 'accepted' ? (
        <Card className="text-center">
          <CheckCircle2 size={32} className="mx-auto text-good" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">Vínculo criado com sucesso</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">
            {profissional} já pode acompanhar sua evolução. Agora é só usar o Monity normalmente.
          </p>
          <a href={APP_PACIENTE_URL} className="mt-4 inline-block">
            <Button>Abrir o Monity</Button>
          </a>
        </Card>
      ) : step === 'declined' ? (
        <Card className="text-center">
          <XCircle size={32} className="mx-auto text-ink-faint dark:text-white/30" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">Convite recusado</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Nenhum vínculo foi criado.</p>
        </Card>
      ) : step === 'confirm' ? (
        <Card className="text-center">
          <Avatar nome={profissional} size={48} />
          <p className="mt-4 text-base font-semibold text-ink dark:text-white">{profissional}</p>
          {preview.profissao_nome && (
            <p className="text-xs text-ink-faint dark:text-white/40">{preview.profissao_nome}</p>
          )}
          <p className="mt-4 text-sm text-ink-soft dark:text-white/60">
            {profissional} deseja acompanhar sua evolução no Monity.
          </p>
          {error && <p className="mt-3 rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex gap-2.5">
            <Button variant="ghost" onClick={recusar} disabled={loading} className="flex-1">
              Recusar
            </Button>
            <Button onClick={aceitar} disabled={loading} className="flex-1">
              {loading ? 'Aguarde…' : 'Aceitar convite'}
            </Button>
          </div>
        </Card>
      ) : confirmarEmail ? (
        <Card className="text-center">
          <p className="text-sm font-semibold text-ink dark:text-white">Confirme seu e-mail</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">
            Mandamos um link de confirmação para <b className="text-ink dark:text-white">{email}</b>. Depois de confirmar, volte
            a este link para aceitar o convite.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 text-left dark:border-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light">
              <Stethoscope size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink dark:text-white">Você foi convidado(a) para o Monity</p>
              <p className="text-xs text-ink-faint dark:text-white/40">
                Profissional responsável: {profissional}
                {preview.profissao_nome ? ` · ${preview.profissao_nome}` : ''}
              </p>
            </div>
          </div>

          <div className="mb-4 flex gap-1 rounded-sm bg-slate-50 p-1 dark:bg-white/5">
            <button
              onClick={() => setModo('criar')}
              className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition ${modo === 'criar' ? 'bg-white text-ink shadow-sm dark:bg-navy-soft dark:text-white' : 'text-ink-faint dark:text-white/40'}`}
            >
              Criar conta
            </button>
            <button
              onClick={() => setModo('entrar')}
              className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition ${modo === 'entrar' ? 'bg-white text-ink shadow-sm dark:bg-navy-soft dark:text-white' : 'text-ink-faint dark:text-white/40'}`}
            >
              Já tenho conta
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {error && <p className="rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
            {modo === 'criar' && <Input label="Nome completo" required value={nome} onChange={(e) => setNome(e.target.value)} />}
            <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Aguarde…' : modo === 'criar' ? 'Criar minha conta' : 'Entrar'}
            </Button>
          </form>
        </Card>
      )}
    </Shell>
  );
}
