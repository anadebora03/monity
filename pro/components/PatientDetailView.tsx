'use client';

import { useState } from 'react';
import type { PatientDetail } from '@/lib/patient-detail';
import { PatientHeader } from '@/components/patient-detail/PatientHeader';
import { StatsGrid } from '@/components/patient-detail/StatsGrid';
import { TimelineList } from '@/components/patient-detail/TimelineList';
import { ObjetivosCard } from '@/components/patient-detail/ObjetivosCard';
import { InsightsClinicos } from '@/components/patient-detail/InsightsClinicos';
import { PlanoAcaoCard } from '@/components/patient-detail/PlanoAcaoCard';
import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/ui/LineChart';
import { PesoTab } from '@/components/patient-detail/tabs/PesoTab';
import { AplicacoesTab } from '@/components/patient-detail/tabs/AplicacoesTab';
import { MedidasTab } from '@/components/patient-detail/tabs/MedidasTab';
import { BioimpedanciaTab } from '@/components/patient-detail/tabs/BioimpedanciaTab';
import { ExamesTab } from '@/components/patient-detail/tabs/ExamesTab';
import { SintomasTab } from '@/components/patient-detail/tabs/SintomasTab';
import { PlanoTerapeuticoTab } from '@/components/patient-detail/tabs/PlanoTerapeuticoTab';
import { AssistenteClinicoTab } from '@/components/patient-detail/tabs/AssistenteClinicoTab';
import type { DadosClinicos } from '@/lib/clinical-intelligence';

const ABAS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'peso', label: 'Peso' },
  { id: 'aplicacoes', label: 'Aplicações' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'bio', label: 'Bioimpedância' },
  { id: 'exames', label: 'Exames' },
  { id: 'sintomas', label: 'Sintomas' },
  { id: 'timeline', label: 'Linha do tempo' },
  { id: 'plano', label: 'Plano terapêutico' },
  { id: 'assistente', label: 'Assistente clínico' },
] as const;
type AbaId = (typeof ABAS)[number]['id'];

/* Estratégia de performance pedida na Sprint 019 ("carregar resumo
   primeiro, depois gráficos, depois timeline, depois o resto"): os
   dados já chegam prontos de uma vez do servidor (uma única leva de
   queries em paralelo, sem N+1 — patient-detail.ts), então o que
   resta controlar é o que MONTA na tela. Cada aba só renderiza seu
   conteúdo quando fica ativa (nunca as 8 de uma vez) — a aba Visão
   geral (resumo) é a primeira e mais leve, e o resto só monta sob
   demanda, exatamente na ordem "resumo -> gráficos -> timeline ->
   demais informações" conforme o profissional navega. */
export function PatientDetailView({ p, workspaceId, dadosClinicos }: { p: PatientDetail; workspaceId: string; dadosClinicos: DadosClinicos }) {
  const [aba, setAba] = useState<AbaId>('geral');

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <PatientHeader p={p} workspaceId={workspaceId} />

      <div className="mt-6">
        <StatsGrid p={p} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex w-max gap-1 border-b border-slate-100 dark:border-white/5">
          {ABAS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={`shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                aba === t.id
                  ? 'border-accent text-accent dark:border-accent-light dark:text-accent-light'
                  : 'border-transparent text-ink-soft hover:text-ink dark:text-white/50 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {aba === 'geral' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="animate-fade-in">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Evolução do peso</p>
                <LineChart data={p.pesagens.map((w) => ({ x: w.date, y: w.peso }))} goal={p.pesoMeta} unit="kg" />
              </Card>
              <Card className="animate-fade-in">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Linha do tempo recente</p>
                <TimelineList eventos={p.timeline} limite={6} />
                {p.timeline.length > 6 && (
                  <button onClick={() => setAba('timeline')} className="mt-3 text-sm font-medium text-accent hover:underline dark:text-accent-light">
                    Ver linha do tempo completa
                  </button>
                )}
              </Card>
            </div>
            <div className="space-y-4">
              <ObjetivosCard p={p} />
              <InsightsClinicos insights={p.insights} />
              <PlanoAcaoCard itens={p.planoAcao} />
            </div>
          </div>
        )}

        {aba === 'peso' && <PesoTab pesagens={p.pesagens} pesoMeta={p.pesoMeta} />}
        {aba === 'aplicacoes' && <AplicacoesTab aplicacoes={p.aplicacoes} proximaAplicacaoDias={p.proximaAplicacaoDias} />}
        {aba === 'medidas' && <MedidasTab pesagens={p.pesagens} />}
        {aba === 'bio' && <BioimpedanciaTab registros={p.bio} />}
        {aba === 'exames' && <ExamesTab exames={p.exames} />}
        {aba === 'sintomas' && <SintomasTab sintomas={p.sintomas} />}
        {aba === 'timeline' && (
          <Card className="animate-fade-in">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Linha do tempo clínica</p>
            <TimelineList eventos={p.timeline} />
          </Card>
        )}
        {aba === 'plano' && <PlanoTerapeuticoTab patientId={p.patientId} workspaceId={workspaceId} planoAutomatico={p.planoAcao} />}
        {aba === 'assistente' && <AssistenteClinicoTab dados={dadosClinicos} />}
      </div>
    </div>
  );
}
