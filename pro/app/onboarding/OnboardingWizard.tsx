'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import type { Profession } from '@/lib/types';
import { completeOnboarding } from './actions';

type Step = 'boas-vindas' | 'profissao' | 'criando';

export function OnboardingWizard({ professions, nome }: { professions: Profession[]; nome: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('boas-vindas');
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleConfirmarProfissao() {
    if (!professionId) return;
    setStep('criando');
    const res = await completeOnboarding(professionId, nome);
    if (!res.ok) {
      setError(res.error);
      setStep('profissao');
      return;
    }
    router.push('/pro');
    router.refresh();
  }

  if (step === 'boas-vindas') {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white">
          C
        </div>
        <h1 className="mt-6 text-2xl font-bold text-ink">Bem-vindo ao Compasso Pro</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
          Vamos configurar rapidamente seu ambiente para que você possa começar a acompanhar seus pacientes.
        </p>
        <button
          onClick={() => setStep('profissao')}
          className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
        >
          Começar
        </button>
      </div>
    );
  }

  if (step === 'profissao') {
    return (
      <div>
        <OnboardingProgress step={1} total={2} label="Sobre você" />
        <h1 className="text-xl font-bold text-ink">Qual é a sua profissão?</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Isso ajusta o Compasso Pro pra sua rotina clínica.</p>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 space-y-3">
          {professions.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfessionId(p.id)}
              className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition ${
                professionId === p.id
                  ? 'border-accent bg-accent/5 text-accent'
                  : 'border-slate-200 text-ink hover:border-slate-300'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirmarProfissao}
          disabled={!professionId}
          className="mt-8 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    );
  }

  // step === 'criando'
  return (
    <div className="text-center">
      <OnboardingProgress step={2} total={2} label="Quase pronto…" />
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-ink">Criando seu ambiente…</p>
      <p className="mt-1 text-sm text-ink-soft">Só um instante.</p>
    </div>
  );
}
