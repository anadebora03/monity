'use client';

import { useState } from 'react';
import { ArrowLeft, FileText, CalendarPlus, Info } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ReportModal } from '@/components/patient-detail/ReportModal';
import { NovoCompromissoModal } from '@/components/agenda/NovoCompromissoModal';
import type { PatientDetail } from '@/lib/patient-detail';
import { NIVEL_LABEL, type PrioridadePaciente } from '@/lib/clinical-priority-engine';

const STATUS_LABEL: Record<PatientDetail['statusClinico'], { label: string; tone: 'good' | 'warn' | 'neutral' }> = {
  evolucao: { label: 'Em evolução', tone: 'good' },
  atencao: { label: 'Em atenção', tone: 'warn' },
  sem_dado: { label: 'Aguardando primeiro acesso', tone: 'neutral' },
};

const PRIORIDADE_TONE: Record<PrioridadePaciente['nivel'], 'good' | 'accent' | 'warn' | 'danger'> = {
  excelente: 'good',
  atencao: 'accent',
  importante: 'warn',
  alta: 'danger',
};

function PrioridadeBadge({ prioridade }: { prioridade: PrioridadePaciente }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-[-0.005em] transition"
        title="Prioridade clínica — clique para ver o motivo"
      >
        <Badge tone={PRIORIDADE_TONE[prioridade.nivel]}>
          <span className="inline-flex items-center gap-1">
            <Info size={11} strokeWidth={2.5} />
            {NIVEL_LABEL[prioridade.nivel]}
          </span>
        </Badge>
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-10 mt-1.5 w-72 rounded-lg border border-slate-100 bg-white p-3 text-xs shadow-card dark:border-white/10 dark:bg-navy-soft dark:shadow-card-dark">
          <p className="font-semibold text-ink dark:text-white">Prioridade clínica: {NIVEL_LABEL[prioridade.nivel]}</p>
          {prioridade.fatores.length > 0 ? (
            <ul className="mt-1.5 space-y-1 text-ink-soft dark:text-white/60">
              {prioridade.fatores.map((f, i) => (
                <li key={i}>• {f.motivo}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-ink-soft dark:text-white/60">Nenhum fator de atenção identificado.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function PatientHeader({ p, workspaceId, prioridade }: { p: PatientDetail; workspaceId: string; prioridade: PrioridadePaciente | null }) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [retornoAberto, setRetornoAberto] = useState(false);
  const st = STATUS_LABEL[p.statusClinico];
  const info = [
    p.dataInicio ? `Início em ${fmtBR(p.dataInicio)}` : null,
    p.medicamento,
    p.doseAtual ? `${p.doseAtual}${p.unidade ? ' ' + p.unidade : ''}` : null,
    p.diasTratamento != null ? `${p.diasTratamento} dia${p.diasTratamento === 1 ? '' : 's'} de tratamento` : null,
  ].filter(Boolean);

  return (
    <div className="relative z-20 animate-fade-in">
      <Link href="/pro/pacientes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white">
        <ArrowLeft size={16} strokeWidth={2} />
        Pacientes
      </Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <Avatar nome={p.nome} size={56} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">{p.nome}</h1>
              <Badge tone={st.tone}>{st.label}</Badge>
              {prioridade && <PrioridadeBadge prioridade={prioridade} />}
            </div>
            <p className="mt-1 text-sm text-ink-soft dark:text-white/60">{info.length ? info.join(' · ') : p.email || 'Sem dados de perfil ainda.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setRetornoAberto(true)}>
            <CalendarPlus size={15} strokeWidth={2} />
            Agendar retorno
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!p.perfilCompleto}
            title={p.perfilCompleto ? undefined : 'O paciente ainda não completou o próprio cadastro no app'}
            onClick={() => setRelatorioAberto(true)}
          >
            <FileText size={15} strokeWidth={2} />
            Gerar relatório
          </Button>
        </div>
      </div>
      <ReportModal open={relatorioAberto} onClose={() => setRelatorioAberto(false)} patientId={p.patientId} />
      <NovoCompromissoModal
        open={retornoAberto}
        onClose={() => setRetornoAberto(false)}
        workspaceId={workspaceId}
        defaultPatientId={p.patientId}
        defaultTipo="Retorno"
      />
    </div>
  );
}

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
