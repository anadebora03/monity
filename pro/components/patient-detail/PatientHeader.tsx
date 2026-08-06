'use client';

import { useState } from 'react';
import { ArrowLeft, FileText, MoreHorizontal, CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ReportModal } from '@/components/patient-detail/ReportModal';
import { NovoCompromissoModal } from '@/components/agenda/NovoCompromissoModal';
import type { PatientDetail } from '@/lib/patient-detail';

const STATUS_LABEL: Record<PatientDetail['statusClinico'], { label: string; tone: 'good' | 'warn' | 'neutral' }> = {
  evolucao: { label: 'Em evolução', tone: 'good' },
  atencao: { label: 'Em atenção', tone: 'warn' },
  sem_dado: { label: 'Aguardando primeiro acesso', tone: 'neutral' },
};

export function PatientHeader({ p, workspaceId }: { p: PatientDetail; workspaceId: string }) {
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
    <div className="animate-fade-in">
      <Link href="/pro/pacientes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white">
        <ArrowLeft size={16} strokeWidth={2} />
        Pacientes
      </Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <Avatar nome={p.nome} size={56} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">{p.nome}</h1>
              <Badge tone={st.tone}>{st.label}</Badge>
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
          <Button variant="ghost" size="sm" disabled title="Disponível em breve">
            <MoreHorizontal size={15} strokeWidth={2} />
            Mais opções
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
