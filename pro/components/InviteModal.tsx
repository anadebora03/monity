'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Share2, Mail, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { criarConvite } from '@/lib/invites';

export function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function fechar() {
    onClose();
    // reseta pro próximo convite, mas só depois do fade-out da modal
    setTimeout(() => {
      setNome('');
      setEmail('');
      setError('');
      setLink(null);
      setCopiado(false);
    }, 200);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await criarConvite(nome, email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLink(`${window.location.origin}/convite/${res.code}`);
  }

  async function copiarLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function compartilhar() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Convite Monity', text: 'Você foi convidado para o Monity.', url: link });
      } catch {
        // usuário cancelou o compartilhamento — nada a fazer
      }
    } else {
      copiarLink();
    }
  }

  const mailtoHref = link
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Convite para o Monity')}&body=${encodeURIComponent(
        `Olá${nome ? ' ' + nome : ''},\n\nVocê foi convidado(a) para acompanhar sua evolução pelo Monity. Acesse o link abaixo para criar sua conta:\n\n${link}`
      )}`
    : '#';

  return (
    <Modal open={open} onClose={fechar} title={link ? 'Convite criado com sucesso' : 'Convidar paciente'}>
      {!link ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
          <Input label="Nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do paciente" />
          <Input
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="paciente@email.com"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Gerando…' : 'Gerar convite'}
          </Button>
        </form>
      ) : (
        <div>
          <p className="mb-3 text-sm text-ink-soft dark:text-white/60">
            Compartilhe o link abaixo — seu paciente cria a conta (ou aceita direto, se já tiver uma) e o vínculo
            acontece automaticamente.
          </p>
          <div className="flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
            <span className="flex-1 truncate text-sm text-ink dark:text-white">{link}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" onClick={copiarLink} className="flex-col gap-1 !py-3">
              {copiado ? <Check size={16} /> : <Copy size={16} />}
              {copiado ? 'Copiado' : 'Copiar link'}
            </Button>
            <Button variant="secondary" size="sm" onClick={compartilhar} className="flex-col gap-1 !py-3">
              <Share2 size={16} />
              Compartilhar
            </Button>
            <a href={mailtoHref}>
              <Button variant="secondary" size="sm" className="w-full flex-col gap-1 !py-3">
                <Mail size={16} />
                Por e-mail
              </Button>
            </a>
          </div>
          <Button variant="ghost" onClick={fechar} className="mt-4 w-full">
            Concluir
          </Button>
        </div>
      )}
    </Modal>
  );
}
