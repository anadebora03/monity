'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { CategoriaFator, NivelPrioridade, PrioridadePaciente } from '@/lib/clinical-priority-engine';
import { NIVEL_LABEL } from '@/lib/clinical-priority-engine';

const NIVEL_TONE: Record<NivelPrioridade, 'warn' | 'danger' | 'accent'> = {
  excelente: 'accent',
  atencao: 'accent',
  importante: 'warn',
  alta: 'danger',
};

const CATEGORIA_LABEL: Record<CategoriaFator, string> = {
  atualizacao: 'Sem atualização',
  peso: 'Peso',
  aplicacoes: 'Aplicações',
  sintomas: 'Sintomas',
  agua: 'Água',
  proteina: 'Proteína',
  bioimpedancia: 'Bioimpedância',
  exames: 'Exames',
  agenda: 'Agenda',
  plano_terapeutico: 'Plano Terapêutico',
};

// Ordem/agrupamento pedido no brief — "Aplicações"/"Peso"/"Sintomas" etc.
// como filtros próprios; água e proteína entram dentro de "Aplicações"
// pra não estourar a lista de chips com categorias raramente usadas sozinhas.
const FILTROS: { label: string; categorias: CategoriaFator[] }[] = [
  { label: 'Aplicações', categorias: ['aplicacoes', 'agua', 'proteina'] },
  { label: 'Peso', categorias: ['peso'] },
  { label: 'Sintomas', categorias: ['sintomas'] },
  { label: 'Agenda', categorias: ['agenda'] },
  { label: 'Bioimpedância', categorias: ['bioimpedancia'] },
  { label: 'Exames', categorias: ['exames'] },
  { label: 'Plano Terapêutico', categorias: ['plano_terapeutico'] },
];

function fmtRelativo(iso: string | null): string {
  if (!iso) return 'Sem registro';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function PriorityPatientsCard({ pacientes }: { pacientes: PrioridadePaciente[] }) {
  const [altaSo, setAltaSo] = useState(false);
  const [categoria, setCategoria] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    return pacientes.filter((p) => {
      if (altaSo && p.nivel !== 'alta') return false;
      if (categoria) {
        const filtro = FILTROS.find((f) => f.label === categoria);
        if (filtro && !p.fatores.some((f) => filtro.categorias.includes(f.categoria))) return false;
      }
      return true;
    });
  }, [pacientes, altaSo, categoria]);

  if (pacientes.length === 0) {
    return (
      <Card className="animate-fade-in py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/10 dark:bg-good/15">
          <AlertTriangle size={20} strokeWidth={2} className="text-good" />
        </div>
        <p className="mt-4 text-base font-bold text-ink dark:text-white">Tudo em ordem.</p>
        <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Nenhum paciente necessita acompanhamento prioritário neste momento.</p>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={17} strokeWidth={2} className="text-warn" />
          <p className="text-base font-bold text-ink dark:text-white">Pacientes prioritários</p>
        </div>
        <button
          onClick={() => setAltaSo((v) => !v)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            altaSo ? 'bg-danger/10 text-danger dark:bg-danger/15' : 'bg-slate-100 text-ink-soft dark:bg-white/5 dark:text-white/60'
          }`}
        >
          Só prioridade alta
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.label}
            onClick={() => setCategoria((c) => (c === f.label ? null : f.label))}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              categoria === f.label
                ? 'bg-accent text-white dark:bg-accent-light dark:text-navy'
                : 'bg-slate-100 text-ink-soft hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {filtrados.length === 0 && <p className="text-sm text-ink-faint dark:text-white/40">Nenhum paciente nesse filtro.</p>}
        {filtrados.map((p) => (
          <div key={p.patientId} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-white/5">
            <Avatar nome={p.nome} size={38} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-ink dark:text-white">{p.nome}</p>
                <Badge tone={NIVEL_TONE[p.nivel]}>{NIVEL_LABEL[p.nivel]}</Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-faint dark:text-white/40">
                {p.fatores[0]?.motivo ?? 'Sem detalhes'} · última atualização {fmtRelativo(p.ultimoRegistro)}
              </p>
            </div>
            <Link href={`/pro/pacientes/${p.patientId}`}>
              <Button variant="secondary" size="sm">
                Abrir paciente
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
