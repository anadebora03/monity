'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { criarPlanoTerapeutico, CATEGORIAS_PLANO, MODELOS_PLANO, type CategoriaPlano, type PrioridadePlano } from '@/lib/plano-terapeutico-data';

export function NovoPlanoModal({
  open,
  onClose,
  workspaceId,
  professionalId,
  patientId,
  abrirEmModelo = false,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  professionalId: string;
  patientId: string;
  abrirEmModelo?: boolean;
  onCreated?: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaPlano>('Outro');
  const [prazo, setPrazo] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadePlano>('media');
  const [permitirConclusao, setPermitirConclusao] = useState(true);
  const [mostrarModelos, setMostrarModelos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setMostrarModelos(abrirEmModelo);
  }, [open, abrirEmModelo]);

  function aplicarModelo(nome: string) {
    const modelo = MODELOS_PLANO.find((m) => m.nome === nome);
    if (!modelo) return;
    setTitulo(modelo.titulo);
    setDescricao(modelo.descricao);
    setCategoria(modelo.categoria);
    setMostrarModelos(false);
  }

  function fechar() {
    onClose();
    setTimeout(() => {
      setTitulo('');
      setDescricao('');
      setCategoria('Outro');
      setPrazo('');
      setPrioridade('media');
      setPermitirConclusao(true);
      setError('');
      setMostrarModelos(false);
    }, 200);
  }

  async function salvar() {
    if (!titulo.trim()) {
      setError('Dê um título pra essa orientação.');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const res = await criarPlanoTerapeutico(supabase, {
      workspaceId,
      professionalId,
      patientId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      categoria,
      prazo: prazo || null,
      prioridade,
      permitirConclusaoPaciente: permitirConclusao,
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
    <Modal open={open} onClose={fechar} title="Nova orientação">
      <div className="space-y-4">
        {error && <p className="rounded-sm bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

        <div>
          <button
            onClick={() => setMostrarModelos((v) => !v)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline dark:text-accent-light"
          >
            <Sparkles size={14} strokeWidth={2} />
            Criar a partir de modelo
          </button>
          {mostrarModelos && (
            <div className="mt-2 grid grid-cols-1 gap-1.5 rounded-sm border border-slate-100 p-2 dark:border-white/10">
              {MODELOS_PLANO.map((m) => (
                <button
                  key={m.nome}
                  onClick={() => aplicarModelo(m.nome)}
                  className="rounded-sm px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-slate-50 dark:text-white dark:hover:bg-white/5"
                >
                  {m.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Caminhar 30 minutos, 5x por semana" />

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Descrição</span>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Categoria</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaPlano)}
              className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent dark:border-border-dark dark:bg-navy-soft dark:text-white"
            >
              {CATEGORIAS_PLANO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Input label="Prazo (opcional)" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink dark:text-white">Prioridade</span>
          <div className="flex gap-1.5">
            {(['alta', 'media', 'baixa'] as PrioridadePlano[]).map((p) => (
              <button
                key={p}
                onClick={() => setPrioridade(p)}
                className={`flex-1 rounded-sm py-2 text-xs font-medium capitalize transition-colors duration-150 ${
                  prioridade === p ? 'bg-accent-gradient text-white' : 'bg-slate-100 text-ink-soft dark:bg-white/5 dark:text-white/60'
                }`}
              >
                {p === 'media' ? 'Média' : p}
              </button>
            ))}
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink dark:text-white">
          <input type="checkbox" checked={permitirConclusao} onChange={(e) => setPermitirConclusao(e.target.checked)} className="h-4 w-4 rounded accent-accent" />
          Permitir que o paciente marque como concluído
        </label>

        <Button onClick={salvar} disabled={loading} className="w-full">
          {loading ? 'Salvando…' : 'Salvar orientação'}
        </Button>
      </div>
    </Modal>
  );
}
