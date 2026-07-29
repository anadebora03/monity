'use client';

import { useState } from 'react';
import { Mail, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { InviteModal } from '@/components/InviteModal';
import type { Convite } from '@/lib/invites';

const STATUS: Record<Convite['status'], { label: string; tone: 'good' | 'warn' | 'danger' | 'neutral' }> = {
  pending: { label: 'Pendente', tone: 'warn' },
  active: { label: 'Aceito', tone: 'good' },
  declined: { label: 'Recusado', tone: 'danger' },
  ended: { label: 'Encerrado', tone: 'neutral' },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export function ConvitesView({ convites }: { convites: Convite[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">Convites</h1>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Convide pacientes e acompanhe quem já aceitou.</p>
        </div>
        {convites.length > 0 && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} strokeWidth={2.5} />
            Convidar paciente
          </Button>
        )}
      </div>

      {convites.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Mail}
            title="Nenhum convite enviado"
            description="Convide seu primeiro paciente — ele cria a conta (ou aceita direto, se já tiver uma) e o vínculo acontece automaticamente."
            action={<Button onClick={() => setModalOpen(true)}>Convidar paciente</Button>}
          />
        </div>
      ) : (
        <Card className="mt-4 animate-fade-in">
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {convites.map((c) => {
              const st = STATUS[c.status];
              return (
                <li key={c.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <Avatar nome={c.nome || c.email || '?'} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink dark:text-white">{c.nome || c.email}</p>
                    <p className="truncate text-xs text-ink-faint dark:text-white/40">
                      {c.email} · convidado em {formatDate(c.invitedAt)}
                    </p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <InviteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
