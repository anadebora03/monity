'use client';

import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import type { PacienteDashboard } from '@/lib/dashboard';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(iso));
}

const STATUS_LABEL: Record<PacienteDashboard['status'], { label: string; tone: 'good' | 'warn' | 'neutral' }> = {
  evolucao: { label: 'Em evolução', tone: 'good' },
  atencao: { label: 'Em atenção', tone: 'warn' },
  sem_dado: { label: 'Sem registros', tone: 'neutral' },
};

/* Tabela "elegante" da Sprint 017 — clicar na linha navega pro
   Perfil 360° do paciente (Sprint 019), o destino que esse
   cursor-pointer já antecipava desde então. */
export function PatientTable({ pacientes }: { pacientes: PacienteDashboard[] }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[.07em] text-ink-faint dark:border-white/5 dark:text-white/40">
            <th className="pb-3 pr-4 font-semibold">Paciente</th>
            <th className="pb-3 pr-4 font-semibold">Último registro</th>
            <th className="pb-3 pr-4 font-semibold">Peso atual</th>
            <th className="pb-3 pr-4 font-semibold">Evolução</th>
            <th className="pb-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((p, i) => {
            const st = STATUS_LABEL[p.status];
            return (
              <tr
                key={p.id}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => router.push(`/pro/pacientes/${p.id}`)}
                className="animate-fade-in cursor-pointer border-b border-slate-50 transition-colors duration-150 ease-out last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar nome={p.nome} size={30} />
                    <span className="font-medium text-ink dark:text-white">{p.nome}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-ink-soft dark:text-white/60">
                  {p.status === 'sem_dado' ? '—' : formatDate(p.ultimoRegistro)}
                </td>
                <td className="py-3 pr-4 text-ink dark:text-white">{p.pesoAtual != null ? `${p.pesoAtual} kg` : '—'}</td>
                <td className="py-3 pr-4">
                  {p.evolucaoDesdeInicio != null ? (
                    <span className={p.evolucaoDesdeInicio >= 0 ? 'text-good' : 'text-danger'}>
                      {p.evolucaoDesdeInicio >= 0 ? '−' : '+'}
                      {Math.abs(p.evolucaoDesdeInicio)} kg
                    </span>
                  ) : (
                    <span className="text-ink-faint dark:text-white/40">—</span>
                  )}
                </td>
                <td className="py-3">
                  <Badge tone={st.tone === 'neutral' ? 'neutral' : st.tone}>{st.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
