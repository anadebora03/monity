'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PacienteLista } from '@/lib/patients';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}
function diasDesde(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function PacientesView({ pacientes }: { pacientes: PacienteLista[] }) {
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) => p.nome.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  }, [busca, pacientes]);

  if (pacientes.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
        <EmptyState
          icon={Users}
          title="Seus pacientes aparecerão aqui"
          description="Convide seu primeiro paciente para começar o acompanhamento."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">Pacientes</h1>
      <p className="mt-1 text-sm text-ink-soft dark:text-white/60">
        {pacientes.length} paciente{pacientes.length > 1 ? 's' : ''} vinculado{pacientes.length > 1 ? 's' : ''}.
      </p>

      <div className="relative mt-6 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-white/40" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-border-dark dark:bg-navy-soft dark:text-white dark:placeholder:text-white/30"
        />
      </div>

      <Card className="mt-4 animate-fade-in">
        {filtrados.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint dark:text-white/40">
            Nenhum paciente encontrado para &ldquo;{busca}&rdquo;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[.07em] text-ink-faint dark:border-white/5 dark:text-white/40">
                  <th className="pb-3 pr-4 font-semibold">Paciente</th>
                  <th className="pb-3 pr-4 font-semibold">Última atualização</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Vinculado em</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => {
                  const dias = p.perfilCompleto ? diasDesde(p.ultimoRegistro) : null;
                  return (
                    <tr
                      key={p.id}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className="animate-fade-in cursor-pointer border-b border-slate-50 transition-colors duration-150 ease-out last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar nome={p.nome} size={30} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink dark:text-white">{p.nome}</p>
                            {p.email && <p className="truncate text-xs text-ink-faint dark:text-white/40">{p.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink-soft dark:text-white/60">
                        {dias === null ? '—' : dias === 0 ? 'Hoje' : `há ${dias} dia${dias > 1 ? 's' : ''}`}
                      </td>
                      <td className="py-3 pr-4">
                        {dias === null ? (
                          <Badge tone="neutral">Aguardando primeiro acesso</Badge>
                        ) : (
                          <Badge tone={dias > 10 ? 'warn' : 'good'}>{dias > 10 ? 'Em atenção' : 'Em evolução'}</Badge>
                        )}
                      </td>
                      <td className="py-3 text-ink-soft dark:text-white/60">{formatDate(p.dataVinculo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
