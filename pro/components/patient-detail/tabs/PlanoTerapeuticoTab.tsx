'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles, Search, ClipboardList, Compass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { createClient } from '@/lib/supabase/client';
import { NovoPlanoModal } from '@/components/patient-detail/NovoPlanoModal';
import { listarPlanosTerapeuticos, statsPacientePlano, type PlanoTerapeutico, type StatusPlano } from '@/lib/plano-terapeutico-data';
import type { PlanoItem } from '@/lib/patient-detail';

const STATUS_LABEL: Record<StatusPlano, { label: string; tone: 'neutral' | 'accent' | 'good' | 'danger' }> = {
  pendente: { label: 'Pendente', tone: 'neutral' },
  em_andamento: { label: 'Em andamento', tone: 'accent' },
  concluido: { label: 'Concluído', tone: 'good' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function PlanoTerapeuticoTab({ patientId, workspaceId, planoAutomatico }: { patientId: string; workspaceId: string; planoAutomatico: PlanoItem[] }) {
  const [planos, setPlanos] = useState<PlanoTerapeutico[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [abrirEmModelo, setAbrirEmModelo] = useState(false);
  const [carregado, setCarregado] = useState(false);

  function carregar() {
    const supabase = createClient();
    listarPlanosTerapeuticos(supabase, patientId).then((r) => {
      setPlanos(r);
      setCarregado(true);
    });
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setProfessionalId(data.user?.id || ''));
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const stats = useMemo(() => statsPacientePlano(planos), [planos]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return planos;
    return planos.filter((p) => p.titulo.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q) || STATUS_LABEL[p.status].label.toLowerCase().includes(q));
  }, [busca, planos]);

  async function mudarStatus(id: string, status: StatusPlano) {
    const supabase = createClient();
    await supabase.from('planos_terapeuticos').update({ status, concluido_em: status === 'concluido' ? new Date().toISOString() : null }).eq('id', id);
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label="Planos ativos" value={stats.ativos} />
        <StatCard icon={ClipboardList} label="Concluídos" value={stats.concluidos} tone="good" />
        <StatCard icon={ClipboardList} label="Taxa de adesão" value={stats.adesao != null ? `${stats.adesao}%` : '—'} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-white/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, categoria ou status…"
            className="w-full rounded-sm border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAbrirEmModelo(true);
              setModalAberto(true);
            }}
          >
            <Sparkles size={14} strokeWidth={2} />
            Criar a partir de modelo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setAbrirEmModelo(false);
              setModalAberto(true);
            }}
          >
            <Plus size={14} strokeWidth={2} />
            Nova orientação
          </Button>
        </div>
      </div>

      <Card className="animate-fade-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Plano criado pelo Compasso</p>
        {planoAutomatico.length === 0 ? (
          <p className="text-sm text-ink-faint dark:text-white/40">Nada pedindo atenção agora, segundo os dados sincronizados.</p>
        ) : (
          <ul className="space-y-3">
            {planoAutomatico.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Badge tone={item.prioridade === 'alta' ? 'danger' : 'warn'}>{item.prioridade === 'alta' ? 'Alta' : 'Média'}</Badge>
                <div>
                  <p className="text-[13px] font-semibold text-ink dark:text-white">{item.titulo}</p>
                  <p className="text-[13px] text-ink-soft dark:text-white/60">{item.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="animate-fade-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Plano criado pelo profissional</p>
        {!carregado ? null : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Compass size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
            <p className="mt-2 text-sm text-ink-faint dark:text-white/40">
              {planos.length === 0 ? 'Nenhuma orientação personalizada. Crie o primeiro plano terapêutico para este paciente.' : `Nenhum item encontrado para "${busca}".`}
            </p>
            {planos.length === 0 && (
              <Button size="sm" className="mt-4" onClick={() => setModalAberto(true)}>
                <Plus size={14} strokeWidth={2} />
                Nova orientação
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtrados.map((p) => {
              const st = STATUS_LABEL[p.status];
              return (
                <li key={p.id} className="rounded-sm border border-slate-100 p-3 dark:border-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink dark:text-white">{p.titulo}</p>
                      {p.descricao && <p className="mt-0.5 text-[13px] text-ink-soft dark:text-white/60">{p.descricao}</p>}
                      <p className="mt-1 text-xs text-ink-faint dark:text-white/40">
                        {p.categoria} · criado em {fmtBR(p.createdAt.slice(0, 10))}
                        {p.prazo ? ` · prazo ${fmtBR(p.prazo)}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {p.status !== 'concluido' && p.status !== 'cancelado' && (
                        <select
                          value={p.status}
                          onChange={(e) => mudarStatus(p.id, e.target.value as StatusPlano)}
                          className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs text-ink outline-none dark:border-border-dark dark:bg-navy-soft dark:text-white"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="concluido">Concluído</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <NovoPlanoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        workspaceId={workspaceId}
        professionalId={professionalId}
        patientId={patientId}
        abrirEmModelo={abrirEmModelo}
        onCreated={carregar}
      />
    </div>
  );
}
