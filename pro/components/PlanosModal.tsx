'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { PlanoCatalogo } from '@/lib/subscription';
import { solicitarUpgrade } from '@/app/pro/assinatura/actions';

function formatMoney(cents: number | null): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* Comparação dos planos (item 6/7 do brief). Sem gateway de pagamento,
   "Fazer upgrade" não troca o plano na hora — grava a solicitação em
   workspaces.requested_plan_id (solicitarUpgrade, actions.ts) pro time
   processar manualmente. Plano atual nunca aparece como algo a
   comprar de novo; plano inferior ao atual não oferece downgrade
   nesta versão (não inventar uma regra que o backend não decidiu). */
export function PlanosModal({
  open,
  onClose,
  catalogo,
  planoAtualId,
}: {
  open: boolean;
  onClose: () => void;
  catalogo: PlanoCatalogo[];
  planoAtualId: string | null;
}) {
  const router = useRouter();
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [enviadoId, setEnviadoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const planoAtualIdx = catalogo.findIndex((p) => p.id === planoAtualId);

  async function upgrade(plano: PlanoCatalogo) {
    setErro(null);
    setEnviandoId(plano.id);
    const res = await solicitarUpgrade(plano.id);
    setEnviandoId(null);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    setEnviadoId(plano.id);
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Comparar planos" maxWidth="max-w-4xl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {catalogo.map((plano, idx) => {
          const isAtual = plano.id === planoAtualId;
          const isInferior = planoAtualIdx >= 0 && idx < planoAtualIdx;
          const nomeCurto = plano.nome.replace(/^Monity Pro\s*/, '');

          return (
            <div
              key={plano.id}
              className={`flex flex-col rounded-md border p-4 ${
                isAtual ? 'border-accent/40 bg-accent/5 dark:bg-accent-light/5' : 'border-slate-100 dark:border-white/5'
              }`}
            >
              {plano.destaque && (
                <div className="mb-2">
                  <Badge tone="accent">Mais escolhido</Badge>
                </div>
              )}
              <p className="text-sm font-bold tracking-[-0.01em] text-ink dark:text-white">{nomeCurto}</p>
              <p className="mt-0.5 text-xs text-ink-soft dark:text-white/60">
                {plano.patient_limit != null ? `Até ${plano.patient_limit} pacientes` : 'Pacientes ilimitados'}
              </p>
              <p className="mt-2.5 text-lg font-bold tracking-[-0.01em] text-ink dark:text-white">
                {formatMoney(plano.price_cents)}
                <span className="text-xs font-medium text-ink-faint dark:text-white/40">/mês</span>
              </p>

              <ul className="mt-3 flex-1 space-y-1.5">
                {plano.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[12.5px] text-ink-soft dark:text-white/60">
                    <Check size={13} strokeWidth={2.4} className="mt-0.5 shrink-0 text-good" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {isAtual ? (
                  <>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-accent dark:text-accent-light">
                      Seu plano atual
                    </p>
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      Plano atual
                    </Button>
                  </>
                ) : isInferior ? (
                  <Button variant="ghost" size="sm" className="w-full" disabled>
                    Disponível para alteração
                  </Button>
                ) : enviadoId === plano.id ? (
                  <p className="text-center text-xs font-medium text-good">Solicitação enviada.</p>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => upgrade(plano)} disabled={enviandoId === plano.id}>
                    {enviandoId === plano.id ? 'Enviando…' : 'Fazer upgrade'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {erro && <p className="mt-3 text-xs text-danger">{erro}</p>}
      <p className="mt-4 text-[11.5px] text-ink-faint dark:text-white/40">
        Sem integração de pagamento automática por enquanto: um upgrade solicitado aqui é confirmado manualmente pelo time Monity.
      </p>
    </Modal>
  );
}
