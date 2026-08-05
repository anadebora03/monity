import Link from 'next/link';
import { Users, RefreshCw, AlertCircle, Syringe, UserPlus, Compass, ClipboardList } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard';
import { HeroCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PatientTable } from '@/components/ui/PatientTable';
import { InsightCard } from '@/components/ui/InsightCard';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* Segunda linha do cabeçalho — a "mensagem viva" pedida na Sprint
   017. Prioridade: quem precisa de atenção fala primeiro (é a
   informação mais acionável), depois o volume de atualizações, só
   então o "tudo tranquilo". Nunca as três ao mesmo tempo — o
   cabeçalho é pra ler em segundos, não pra listar tudo. */
function mensagemViva(d: { emAtencao: number; atualizacoesHoje: number }): string {
  if (d.emAtencao > 0) return `Hoje você possui ${d.emAtencao} paciente${d.emAtencao > 1 ? 's' : ''} que merece${d.emAtencao > 1 ? 'm' : ''} atenção.`;
  if (d.atualizacoesHoje > 0) return `Hoje ${d.atualizacoesHoje} paciente${d.atualizacoesHoje > 1 ? 's' : ''} registrou${d.atualizacoesHoje > 1 ? 'aram' : ''} novas informações.`;
  return 'Tudo tranquilo. Nenhum alerta importante foi identificado hoje.';
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
            title="Bem-vindo ao Compasso Pro"
            description="Seu ambiente está pronto. Agora vamos começar convidando seu primeiro paciente."
            action={
              <>
                <Button disabled title="Disponível em breve">
                  Convidar paciente
                </Button>
                <Button variant="secondary" disabled title="Disponível em breve">
                  Conhecer a plataforma
                </Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      {/* Cabeçalho inteligente */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">
          {saudacao()}, {nome}.
        </h1>
        <p className="mt-1 text-sm text-ink-soft dark:text-white/60">{mensagemViva(d)}</p>
      </div>

      {/* Cards principais */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Pacientes ativos"
          value={d.pacientesAtivos}
          caption={[
            d.novosEsteMs > 0 ? `+${d.novosEsteMs} este mês` : null,
            d.percentualPlano != null ? `${d.percentualPlano}% do plano utilizado` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <StatCard icon={RefreshCw} label="Atualizações hoje" value={d.atualizacoesHoje} caption="pacientes atualizaram dados" />
        {d.emAtencao > 0 ? (
          <Link href="/pro/pacientes?atencao=1" className="block">
            <StatCard icon={AlertCircle} label="Atenção necessária" value={d.emAtencao} tone="warn" caption="precisam de acompanhamento — ver lista" />
          </Link>
        ) : (
          <StatCard icon={AlertCircle} label="Atenção necessária" value={d.emAtencao} tone="accent" caption="nenhum alerta agora" />
        )}
        <StatCard
          icon={Syringe}
          label="Próximas aplicações"
          value={d.proximasAplicacoes.hoje}
          caption={`hoje · ${d.proximasAplicacoes.amanha} amanhã · ${d.proximasAplicacoes.semana} esta semana`}
        />
      </div>

      {/* Resumo do dia */}
      {d.resumoDia.length > 0 && (
        <Card className="mt-4 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Resumo do dia</p>
          <ul className="mt-3 space-y-2">
            {d.resumoDia.map((linha, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink dark:text-white">
                <span className="text-accent dark:text-accent-light">•</span>
                {linha}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pacientes recentes */}
        <Card className="animate-fade-in lg:col-span-2">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
            Pacientes recentes
          </p>
          <PatientTable pacientes={d.pacientes.slice(0, 8)} />
        </Card>

        {/* Coluna lateral: insights + agenda */}
        <div className="space-y-4">
          <Card className="animate-fade-in">
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
          </Card>

          <Card className="animate-fade-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Agenda de hoje</p>
              <Link href="/pro/agenda" className="text-xs font-medium text-accent hover:underline dark:text-accent-light">
                Ver agenda
              </Link>
            </div>
            {d.agendaHoje.length > 0 ? (
              <ul className="space-y-3">
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

          <Card className="animate-fade-in">
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
          </Card>
        </div>
      </div>
    </div>
  );
}
