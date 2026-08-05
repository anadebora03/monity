'use client';

import { useEffect, useState } from 'react';
import { Scale, Syringe, Pill, CalendarClock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { listarPacientes, type PacienteLista } from '@/lib/patients';
import { criarCompromisso, getPacienteResumoRapido, TIPOS_COMPROMISSO, type PacienteResumoRapido, type StatusCompromisso } from '@/lib/agenda-data';

const CORES = ['#2E6FC9', '#1F9D6B', '#C97F1E', '#C24A3A', '#8B5CF6', '#64748B'];
const STATUS_OPCOES: { id: StatusCompromisso; label: string }[] = [
  { id: 'agendado', label: 'Agendado' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'realizado', label: 'Realizado' },
  { id: 'cancelado', label: 'Cancelado' },
  { id: 'reagendado', label: 'Reagendado' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function NovoCompromissoModal({
  open,
  onClose,
  workspaceId,
  defaultPatientId,
  defaultTipo,
  defaultData,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  defaultPatientId?: string;
  defaultTipo?: string;
  defaultData?: string;
  onCreated?: () => void;
}) {
  const [pacientes, setPacientes] = useState<PacienteLista[]>([]);
  const [patientId, setPatientId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(defaultData || todayISO());
  const [hora, setHora] = useState('09:00');
  const [duracaoMin, setDuracaoMin] = useState(30);
  const [tipo, setTipo] = useState<string>(defaultTipo || TIPOS_COMPROMISSO[0]);
  const [observacoes, setObservacoes] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [status, setStatus] = useState<StatusCompromisso>('agendado');
  const [resumo, setResumo] = useState<PacienteResumoRapido | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    listarPacientes(supabase).then(setPacientes);
    setPatientId(defaultPatientId || '');
    setData(defaultData || todayISO());
    setTipo(defaultTipo || TIPOS_COMPROMISSO[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!patientId) {
      setResumo(null);
      return;
    }
    const supabase = createClient();
    getPacienteResumoRapido(supabase, patientId).then(setResumo);
  }, [patientId]);

  function fechar() {
    onClose();
    setTimeout(() => {
      setPatientId('');
      setTitulo('');
      setObservacoes('');
      setError('');
      setResumo(null);
      setStatus('agendado');
    }, 200);
  }

  async function salvar() {
    if (!data) {
      setError('Informe a data do compromisso.');
      return;
    }
    if (!patientId && !titulo.trim()) {
      setError('Selecione um paciente ou dê um título pro compromisso.');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const res = await criarCompromisso(supabase, {
      workspaceId,
      patientId: patientId || null,
      titulo: titulo.trim() || null,
      data,
      hora: hora || null,
      duracaoMin,
      tipo,
      observacoes: observacoes.trim() || null,
      cor,
      status,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated?.();
    fechar();
  }

  return (
    <Modal open={open} onClose={fechar} title="Novo compromisso">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {error && <p className="rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Paciente (opcional)</span>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
          >
            <option value="">Sem paciente vinculado</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        {resumo && (
          <div className="grid grid-cols-2 gap-2 rounded-sm border border-accent/15 bg-accent-gradient-soft p-3 text-[13px] dark:border-accent-light/15">
            <div className="flex items-center gap-1.5 text-ink dark:text-white">
              <Scale size={13} strokeWidth={2} className="text-accent dark:text-accent-light" />
              {resumo.pesoAtual != null ? `${resumo.pesoAtual} kg` : '—'}
            </div>
            <div className="flex items-center gap-1.5 text-ink dark:text-white">
              <CalendarClock size={13} strokeWidth={2} className="text-accent dark:text-accent-light" />
              {resumo.diasSemAtualizar != null ? `há ${resumo.diasSemAtualizar}d sem atualizar` : '—'}
            </div>
            <div className="flex items-center gap-1.5 text-ink dark:text-white">
              <Pill size={13} strokeWidth={2} className="text-accent dark:text-accent-light" />
              {resumo.medicamento || '—'} {resumo.doseAtual ? `· ${resumo.doseAtual}${resumo.unidade || ''}` : ''}
            </div>
            <div className="flex items-center gap-1.5 text-ink dark:text-white">
              <Syringe size={13} strokeWidth={2} className="text-accent dark:text-accent-light" />
              {resumo.ultimaAplicacaoData ? `última em ${fmtBR(resumo.ultimaAplicacaoData.slice(0, 10))}` : 'sem aplicações'}
            </div>
          </div>
        )}

        {!patientId && <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Bloqueio de agenda, Reunião…" />}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <Input label="Hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Duração (min)</span>
            <select
              value={duracaoMin}
              onChange={(e) => setDuracaoMin(Number(e.target.value))}
              className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
            >
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
            >
              {TIPOS_COMPROMISSO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Observações</span>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Cor</span>
            <div className="flex gap-1.5">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  aria-label={c}
                  className={`h-7 w-7 rounded-full transition-transform ${cor === c ? 'scale-110 ring-2 ring-offset-2 ring-ink/20 dark:ring-offset-navy-soft' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusCompromisso)}
              className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button onClick={salvar} disabled={loading} className="w-full">
          {loading ? 'Salvando…' : 'Salvar compromisso'}
        </Button>
      </div>
    </Modal>
  );
}
