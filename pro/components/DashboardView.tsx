import Link from 'next/link';
import { Users, RefreshCw, AlertTriangle, UserPlus, Compass, ClipboardList } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard';
import { HeroCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PatientTable } from '@/components/ui/PatientTable';
import { InsightCard } from '@/components/ui/InsightCard';
import { PriorityPatientsCard } from '@/components/ui/PriorityPatientsCard';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* Cabeçalho inteligente (Sprint 027). A pergunta que o Dashboard
   inteiro responde é "quem precisa de mim hoje?" — então o
   cabeçalho já adianta a resposta em 3 sinais acionáveis (nunca
   genéricos): pacientes prioritários, retornos agendados hoje,
   aplicações previstas hoje. Mesmos números que alimentam os
   indicadores e a Agenda logo abaixo — nunca um cálculo paralelo,
   só reaproveitado como frase. Sem nenhum sinal, uma única frase de
   tranquilidade substitui a lista. */
function bulletsCabecalho(d: DashboardData): string[] {
  const bullets: string[] = [];
  const prioritarios = d.prioridades.pacientes.length;
  const retornosHoje = d.agendaHoje.filter((a) => a.tipo === 'Retorno').length;
  const aplicacoesHoje = d.proximasAplicacoes.hoje;

  if (prioritarios > 0) bullets.push(`${prioritarios} paciente${prioritarios > 1 ? 's' : ''} prioritário${prioritarios > 1 ? 's' : ''}`);
  if (retornosHoje > 0) bullets.push(`${retornosHoje} retorno${retornosHoje > 1 ? 's' : ''} agendado${retornosHoje > 1 ? 's' : ''}`);
  if (aplicacoesHoje > 0) bullets.push(`${aplicacoesHoje} aplicaç${aplicacoesHoje > 1 ? 'ões' : 'ão'} prevista${aplicacoesHoje > 1 ? 's' : ''}`);
  return bullets;
}

export function DashboardView({ nome, d }: { nome: string; d: DashboardData }) {
  if (!d.temPacientes) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-10">
        <HeroCard>
          <p className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">
            {saudacao()}, {nome} 👋
          </p>
          <p className="mt-1.5 text-sm text-ink-soft dark:text-white/60">Seu ambiente foi criado com sucesso.</p>
        </HeroCard>
        <div className="mt-4">
          <EmptyState
            icon={UserPlus}
            title="Bem-vindo ao Monity Pro"
            description="Seu ambiente está pronto. Agora vamos começar convidando seu primeiro paciente."
            action={
              <Link href="/pro/convites">
                <Button>Convidar paciente</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const bullets = bulletsCabecalho(d);
  const prioritariosCount = d.prioridades.pacientes.length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      {/* 1. Cabeçalho inteligente */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">
          {saudacao()}, {nome}.
        </h1>
        {bullets.length > 0 ? (
          <div className="mt-2.5">
            <p className="text-sm text-ink-soft dark:text-white/60">Hoje você possui:</p>
            <ul className="mt-1.5 space-y-1">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                  <span className="text-accent dark:text-accent-light">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-ink-soft dark:text-white/60">Tudo sob controle hoje. Nenhum paciente necessita intervenção imediata.</p>
        )}
      </div>

      {/* 2. Indicadores principais — só três, nada compete por atenção */}
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Pacientes"
          value={d.pacientesAtivos}
          caption={[
            d.novosEsteMs > 0 ? `+${d.novosEsteMs} este mês` : null,
            d.percentualPlano != null ? `${d.percentualPlano}% do plano utilizado` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Prioridades"
          value={prioritariosCount}
          tone={prioritariosCount > 0 ? 'warn' : 'good'}
          caption={prioritariosCount > 0 ? 'precisam de atenção agora' : 'nenhuma pendência agora'}
        />
        <StatCard icon={RefreshCw} label="Atualizações hoje" value={d.atualizacoesHoje} caption="pacientes atualizaram dados" />
      </div>

      {/* 3. Pacientes Prioritários — o centro da experiência */}
      <div className="mt-8">
        <PriorityPatientsCard pacientes={d.prioridades.pacientes} />
      </div>

      {/* 4. Agenda de hoje */}
      <Card className="mt-6 animate-fade-in">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Agenda de hoje</p>
          <Link href="/pro/agenda" className="text-xs font-medium text-accent hover:underline dark:text-accent-light">
            Ver agenda
          </Link>
        </div>
        {d.agendaHoje.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {d.agendaHoje.map((a, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="w-10 shrink-0 font-semibold text-accent dark:text-accent-light">{a.hora ? a.hora.slice(0, 5) : '—'}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink dark:text-white">{a.pacienteNome}</p>
                  <p className="text-ink-faint dark:text-white/40">{a.tipo}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <Compass size={22} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
            <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Nenhum compromisso hoje.</p>
          </div>
        )}
      </Card>

      {/* 5. Pacientes recentes — secundário, peso visual reduzido */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Pacientes recentes</p>
        <div className="rounded-lg border border-slate-100 bg-white p-5 dark:border-white/5 dark:bg-navy-soft/60">
          <PatientTable pacientes={d.pacientes.slice(0, 6)} />
        </div>
      </div>

      {/* 6. Insights clínicos — secundário */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-white p-5 dark:border-white/5 dark:bg-navy-soft/60">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Insights</p>
          {d.insights.length > 0 ? (
            <div className="space-y-2.5">
              {d.insights.map((ins, i) => (
                <InsightCard key={i} {...ins} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint dark:text-white/40">Nenhum insight novo por enquanto.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-white p-5 dark:border-white/5 dark:bg-navy-soft/60">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
            <ClipboardList size={13} strokeWidth={2} />
            Planos terapêuticos
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-ink dark:text-white">{d.planoTerapeutico.pendentes}</p>
              <p className="text-[11px] text-ink-faint dark:text-white/40">Pendentes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-good">{d.planoTerapeutico.concluidos}</p>
              <p className="text-[11px] text-ink-faint dark:text-white/40">Concluídos</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${d.planoTerapeutico.emAtraso > 0 ? 'text-danger' : 'text-ink dark:text-white'}`}>{d.planoTerapeutico.emAtraso}</p>
              <p className="text-[11px] text-ink-faint dark:text-white/40">Em atraso</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
