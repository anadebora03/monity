'use client';

import { useRouter } from 'next/navigation';
import { UserX, Syringe, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PacienteSemAtualizacao, ProximaAplicacao, Compromisso } from '@/lib/agenda-data';

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function AgendaSidebar({
  semAtualizacao,
  aplicacoesHoje,
  retornos,
}: {
  semAtualizacao: PacienteSemAtualizacao[];
  aplicacoesHoje: ProximaAplicacao[];
  retornos: Compromisso[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card className="animate-fade-in">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <UserX size={13} strokeWidth={2} /> Pacientes sem atualização
        </p>
        {semAtualizacao.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Todo mundo em dia.</p>
        ) : (
          <ul className="space-y-2.5">
            {semAtualizacao.map((p) => (
              <li key={p.patientId} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink dark:text-white">{p.nome}</p>
                  <p className="text-xs text-warn">há {p.dias} dias</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/pro/pacientes/${p.patientId}`)}>
                  Abrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="animate-fade-in">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <Syringe size={13} strokeWidth={2} /> Aplicam hoje
        </p>
        {aplicacoesHoje.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nenhuma aplicação prevista pra hoje.</p>
        ) : (
          <ul className="space-y-2">
            {aplicacoesHoje.map((p) => (
              <li key={p.patientId} className="text-[13px]">
                <p className="font-medium text-ink dark:text-white">{p.nome}</p>
                {p.medicamento && <p className="text-xs text-ink-faint dark:text-white/40">{p.medicamento}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="animate-fade-in">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
          <RefreshCw size={13} strokeWidth={2} /> Próximos retornos
        </p>
        {retornos.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nenhum retorno agendado.</p>
        ) : (
          <ul className="space-y-2">
            {retornos.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-[13px]">
                <span className="truncate font-medium text-ink dark:text-white">{c.patientNome || 'Paciente'}</span>
                <span className="shrink-0 text-xs text-ink-faint dark:text-white/40">{formatDate(c.data)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
