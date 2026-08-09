'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, CalendarPlus, Info, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ReportModal } from '@/components/patient-detail/ReportModal';
import { NovoCompromissoModal } from '@/components/agenda/NovoCompromissoModal';
import { encerrarAcompanhamento, atualizarAccessSource, type AccessSource } from '@/app/pro/pacientes/[id]/actions';
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

const ACCESS_SOURCE_LABEL: Record<'professional' | 'independent' | 'null', string> = {
  professional: 'Acesso fornecido por mim',
  independent: 'Assinatura própria do paciente',
  null: 'Origem do acesso: não determinada',
};

/* Origem do acesso (Sprint 3.2) — anotação manual do profissional,
   não uma detecção automática (não existe billing de paciente hoje
   pra inferir isso). Mesmo padrão de popover do PrioridadeBadge
   acima. */
function AccessSourceControl({ relationshipId, accessSource }: { relationshipId: string; accessSource: AccessSource }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(accessSource);
  const [salvando, setSalvando] = useState(false);

  async function escolher(novo: AccessSource) {
    setSalvando(true);
    const res = await atualizarAccessSource(relationshipId, novo);
    setSalvando(false);
    if (res.ok) {
      setValor(novo);
      setAberto(false);
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-slate-50 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/5"
      >
        {ACCESS_SOURCE_LABEL[valor ?? 'null']}
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-10 mt-1.5 w-72 rounded-lg border border-slate-100 bg-white p-2 text-xs shadow-card dark:border-white/10 dark:bg-navy-soft dark:shadow-card-dark">
          <p className="px-2 pb-1.5 pt-1 text-[11px] text-ink-faint dark:text-white/40">
            Isso é só uma anotação sua — não muda nada no acesso do paciente hoje.
          </p>
          {(['professional', 'independent', null] as AccessSource[]).map((opt) => (
            <button
              key={String(opt)}
              disabled={salvando}
              onClick={() => escolher(opt)}
              className={`block w-full rounded-sm px-2 py-1.5 text-left text-[13px] transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                valor === opt ? 'font-semibold text-accent dark:text-accent-light' : 'text-ink dark:text-white'
              }`}
            >
              {ACCESS_SOURCE_LABEL[opt ?? 'null']}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EncerrarAcompanhamentoModal({ open, onClose, relationshipId }: { open: boolean; onClose: () => void; relationshipId: string }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    const res = await encerrarAcompanhamento(relationshipId, motivo);
    setEnviando(false);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    onClose();
    router.push('/pro/pacientes');
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Encerrar acompanhamento?">
      <p className="text-sm text-ink-soft dark:text-white/60">
        Você deixará de acompanhar este paciente. A conta e os dados do paciente não serão excluídos.
      </p>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Motivo (opcional)</span>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition duration-150 ease-out focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-border-dark dark:bg-navy-soft dark:text-white dark:focus:border-accent-light dark:focus:ring-accent-light/10"
        />
      </label>
      {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="danger" size="sm" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Encerrando…' : 'Encerrar acompanhamento'}
        </Button>
      </div>
    </Modal>
  );
}

export function PatientHeader({ p, workspaceId, prioridade }: { p: PatientDetail; workspaceId: string; prioridade: PrioridadePaciente | null }) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [retornoAberto, setRetornoAberto] = useState(false);
  const [encerrarAberto, setEncerrarAberto] = useState(false);
  const st = STATUS_LABEL[p.statusClinico];
  const info = [
    p.dataInicio ? `Início em ${fmtBR(p.dataInicio)}` : null,
    p.medicamento,
    p.doseAtual ? `${p.doseAtual}${p.unidade ? ' ' + p.unidade : ''}` : null,
    p.diasTratamento != null ? `${p.diasTratamento} dia${p.diasTratamento === 1 ? '' : 's'} de tratamento` : null,
  ].filter(Boolean);

  return (
    <div className="relative z-20 animate-fade-in">
      <Link href="/pro/pacientes" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white">
        <ArrowLeft size={15} strokeWidth={2} />
        Pacientes
      </Link>
      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Avatar nome={p.nome} size={44} fotoUrl={p.avatarUrl} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-[-0.02em] text-ink dark:text-white">{p.nome}</h1>
              <Badge tone={st.tone}>{st.label}</Badge>
              {prioridade && <PrioridadeBadge prioridade={prioridade} />}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-soft dark:text-white/60">{info.length ? info.join(' · ') : p.email || 'Sem dados de perfil ainda.'}</p>
            {p.relationshipId && (
              <div className="mt-1.5">
                <AccessSourceControl relationshipId={p.relationshipId} accessSource={p.accessSource} />
              </div>
            )}
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
          {p.relationshipId && (
            <Button variant="secondary" size="sm" onClick={() => setEncerrarAberto(true)} title="Encerra o vínculo — a conta do paciente não é afetada">
              <UserMinus size={15} strokeWidth={2} />
              Encerrar acompanhamento
            </Button>
          )}
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
      {p.relationshipId && (
        <EncerrarAcompanhamentoModal open={encerrarAberto} onClose={() => setEncerrarAberto(false)} relationshipId={p.relationshipId} />
      )}
    </div>
  );
}

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
