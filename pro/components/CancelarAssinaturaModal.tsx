'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cancelarAssinatura } from '@/app/pro/assinatura/actions';

/* Mesmo padrão de EncerrarAcompanhamentoModal (patient-detail/PatientHeader.tsx).
   As regras mostradas abaixo são as únicas que já são reais na
   arquitetura (histórico clínico nunca é apagado; paciente
   independente continua dono da própria conta) — nada de prometer
   suspensão automática de cobrança, que não existe sem gateway. */
export function CancelarAssinaturaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function fechar() {
    onClose();
    setTimeout(() => {
      setMotivo('');
      setErro(null);
      setEnviado(false);
    }, 200);
  }

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    const res = await cancelarAssinatura(motivo || undefined);
    setEnviando(false);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    setEnviado(true);
    router.refresh();
  }

  return (
    <Modal open={open} onClose={fechar} title="Cancelar assinatura?">
      {enviado ? (
        <>
          <p className="text-sm text-ink-soft dark:text-white/60">
            Seu pedido de cancelamento foi registrado. Nosso time vai confirmar os próximos passos com você.
          </p>
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" size="sm" onClick={fechar}>
              Fechar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft dark:text-white/60">Antes de continuar, confira o que acontece com o seu acesso:</p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-ink-soft dark:text-white/60">
            <li>• Seus pacientes e o histórico clínico deles não são apagados.</li>
            <li>• Pacientes que compraram o Monity App por conta própria continuam donos da própria conta — o cancelamento não afeta o acesso deles.</li>
            <li>• Este pedido é registrado para o time do Monity processar; sem integração de pagamento automática ainda, a suspensão da cobrança é confirmada manualmente com você.</li>
          </ul>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Motivo (opcional)</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition duration-150 ease-out focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-border-dark dark:bg-navy-soft dark:text-white dark:focus:border-accent-light dark:focus:ring-accent-light/10"
            />
          </label>
          {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={fechar} disabled={enviando}>
              Voltar
            </Button>
            <Button variant="danger" size="sm" onClick={confirmar} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Cancelar assinatura'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
