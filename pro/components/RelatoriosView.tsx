'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EmissaoRow } from '@/lib/report-data';

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function RelatoriosView({ emissoes }: { emissoes: EmissaoRow[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return emissoes;
    return emissoes.filter((e) => e.patientNome.toLowerCase().includes(q) || e.profissionalNome.toLowerCase().includes(q));
  }, [busca, emissoes]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">Relatórios</h1>
      <p className="mt-1 text-sm text-ink-soft dark:text-white/60">
        {emissoes.length} relatório{emissoes.length !== 1 ? 's' : ''} emitido{emissoes.length !== 1 ? 's' : ''}.
      </p>

      {emissoes.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={FileText}
            title="Nenhum relatório emitido ainda"
            description="Assim que você gerar um relatório a partir do perfil de um paciente, ele aparece aqui."
          />
        </div>
      ) : (
        <>
          <div className="relative mt-6 max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-white/40" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por paciente ou profissional…"
              className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-border-dark dark:bg-navy-soft dark:text-white dark:placeholder:text-white/30"
            />
          </div>

          <Card className="mt-4 animate-fade-in">
            {filtrados.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-faint dark:text-white/40">Nenhum relatório encontrado para &ldquo;{busca}&rdquo;.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[.07em] text-ink-faint dark:border-white/5 dark:text-white/40">
                      <th className="pb-3 pr-4 font-semibold">Paciente</th>
                      <th className="pb-3 pr-4 font-semibold">Período</th>
                      <th className="pb-3 pr-4 font-semibold">Profissional</th>
                      <th className="pb-3 font-semibold">Emitido em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((e, i) => {
                      const abrir = () => router.push(`/pro/pacientes/${e.patientId}`);
                      return (
                      <tr
                        key={e.id}
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={abrir}
                        tabIndex={0}
                        role="link"
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') abrir();
                        }}
                        className="animate-fade-in cursor-pointer border-b border-slate-50 transition-colors duration-150 ease-out last:border-0 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-white/5 dark:hover:bg-white/5"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar nome={e.patientNome} size={28} />
                            <span className="truncate font-medium text-ink dark:text-white">{e.patientNome}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-ink-soft dark:text-white/60">{formatDate(e.periodoIni)} – {formatDate(e.periodoFim)}</td>
                        <td className="py-3 pr-4 text-ink-soft dark:text-white/60">{e.profissionalNome}</td>
                        <td className="py-3 text-ink-soft dark:text-white/60">{formatDateTime(e.createdAt)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
