'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { gerarRelatorioHTML, MODULOS_PADRAO, type ModulosRelatorio, type PeriodoId } from '@/lib/generate-report';

const PERIODOS: { id: PeriodoId; label: string }[] = [
  { id: 'tudo', label: 'Todo histórico' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '60d', label: 'Últimos 60 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'custom', label: 'Personalizado' },
];

const MODULOS_LABELS: { key: keyof ModulosRelatorio; label: string }[] = [
  { key: 'peso', label: 'Peso' },
  { key: 'aplicacoes', label: 'Aplicações' },
  { key: 'bioimpedancia', label: 'Bioimpedância' },
  { key: 'exames', label: 'Exames' },
  { key: 'medidas', label: 'Medidas' },
  { key: 'sintomas', label: 'Sintomas' },
  { key: 'planoAcao', label: 'Plano de ação' },
  { key: 'timeline', label: 'Linha do tempo' },
  { key: 'insights', label: 'Insights' },
];

const MENSAGENS_LOADING = [
  'Gerando relatório clínico…',
  'Organizando informações do paciente…',
  'Preparando gráficos…',
  'Finalizando documento…',
];

export function ReportModal({ open, onClose, patientId }: { open: boolean; onClose: () => void; patientId: string }) {
  const [periodo, setPeriodo] = useState<PeriodoId>('tudo');
  const [customIni, setCustomIni] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [modulos, setModulos] = useState<ModulosRelatorio>(MODULOS_PADRAO);
  const [loading, setLoading] = useState(false);
  const [mensagemIdx, setMensagemIdx] = useState(0);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setMensagemIdx(0);
      intervalRef.current = setInterval(() => setMensagemIdx((i) => Math.min(i + 1, MENSAGENS_LOADING.length - 1)), 550);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  function toggleModulo(key: keyof ModulosRelatorio) {
    setModulos((m) => ({ ...m, [key]: !m[key] }));
  }

  async function gerar() {
    setError('');
    if (periodo === 'custom' && (!customIni || !customFim)) {
      setError('Informe as duas datas do período personalizado.');
      return;
    }
    if (periodo === 'custom' && customIni > customFim) {
      setError('A data inicial deve ser anterior à final.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const res = await gerarRelatorioHTML({
      supabase,
      patientId,
      periodo,
      custom: periodo === 'custom' ? { ini: customIni, fim: customFim } : undefined,
      modulos,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const w = window.open('', '_blank');
    if (!w) {
      setError('Não foi possível abrir a pré-visualização. Verifique o bloqueador de pop-ups do navegador.');
      return;
    }
    w.document.write(res.html);
    w.document.close();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerar relatório clínico">
      {loading ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/20 border-t-accent dark:border-accent-light/20 dark:border-t-accent-light" />
          <p className="mt-4 text-sm font-medium text-ink dark:text-white">{MENSAGENS_LOADING[mensagemIdx]}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {error && <p className="rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Período</p>
            <div className="flex flex-wrap gap-1.5">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    periodo === p.id
                      ? 'bg-accent-gradient text-white'
                      : 'bg-slate-100 text-ink-soft hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {periodo === 'custom' && (
              <div className="mt-3 flex gap-2">
                <input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white" />
                <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white" />
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Módulos incluídos</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {MODULOS_LABELS.map((m) => (
                <label key={m.key} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink dark:text-white">
                  <input type="checkbox" checked={modulos[m.key]} onChange={() => toggleModulo(m.key)} className="h-4 w-4 rounded accent-accent" />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={gerar} className="w-full">
            Gerar e pré-visualizar
          </Button>
          <p className="text-center text-xs text-ink-faint dark:text-white/40">O relatório abre numa nova aba, pronto pra imprimir ou salvar como PDF.</p>
        </div>
      )}
    </Modal>
  );
}
