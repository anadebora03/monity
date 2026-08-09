'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import type { AssinaturaData } from '@/lib/subscription';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PlanosModal } from '@/components/PlanosModal';
import { CancelarAssinaturaModal } from '@/components/CancelarAssinaturaModal';

const SECTION_LABEL = 'text-[11px] font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40';

function formatMoney(cents: number | null): string | null {
  if (cents == null) return null;
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDateLong(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}
function periodoLabel(periodo?: 'mensal' | 'semestral' | 'anual'): string {
  return { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' }[periodo ?? 'mensal'];
}

const SUBSCRIPTION_BADGE: Record<string, { label: string; tone: 'good' | 'accent' | 'danger' | 'neutral' }> = {
  active: { label: 'Ativo', tone: 'good' },
  trialing: { label: 'Período de teste', tone: 'accent' },
  past_due: { label: 'Pagamento pendente', tone: 'danger' },
  canceled: { label: 'Cancelada', tone: 'neutral' },
};
const WORKSPACE_STATUS_BADGE: Record<string, { label: string; tone: 'good' | 'accent' | 'danger' | 'neutral' }> = {
  active: { label: 'Ativo', tone: 'good' },
  inactive: { label: 'Inativo', tone: 'neutral' },
  suspended: { label: 'Suspenso', tone: 'danger' },
};

function InlineVazio({ icon: Icon, texto }: { icon: typeof Receipt; texto: string }) {
  return (
    <div className="flex flex-col items-center py-5 text-center">
      <Icon size={20} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
      <p className="mt-1.5 text-[13px] text-ink-faint dark:text-white/40">{texto}</p>
    </div>
  );
}

/* Alerta de limite (item 4 do brief): faixas fixas, texto/tom mudam,
   nunca bloqueiam pacientes já vinculados — só orientam upgrade. */
function alertaUso(percentual: number | null): { tone: 'warn' | 'danger'; texto: string; ctaPrincipal: boolean } | null {
  if (percentual == null) return null;
  if (percentual >= 100) return { tone: 'danger', texto: 'Seu plano atingiu o limite de pacientes. Faça upgrade para continuar adicionando pacientes.', ctaPrincipal: true };
  if (percentual >= 85) return { tone: 'danger', texto: 'Você está próximo do limite do seu plano.', ctaPrincipal: true };
  if (percentual >= 70) return { tone: 'warn', texto: 'Você está utilizando boa parte dos acessos disponíveis no seu plano.', ctaPrincipal: false };
  return null;
}

export function AssinaturaView({ data }: { data: AssinaturaData }) {
  const [planosAberto, setPlanosAberto] = useState(false);
  const [cancelarAberto, setCancelarAberto] = useState(false);

  const { planoAtual, uso, subscription, planoSolicitado, catalogo, workspaceStatus } = data;

  const statusInfo = subscription ? SUBSCRIPTION_BADGE[subscription.status] : WORKSPACE_STATUS_BADGE[workspaceStatus];
  const valorExibido = subscription?.valor_cents ?? planoAtual?.price_cents ?? null;
  const alerta = alertaUso(uso.percentual);
  const nomeCurto = planoAtual?.nome.replace(/^Monity Pro\s*/, '') ?? '—';

  return (
    <div className="mx-auto max-w-5xl px-6 py-7 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.01em] text-ink dark:text-white">Assinatura</h1>
          <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Seu plano, uso e cobrança no Monity Pro.</p>
        </div>
        <Button onClick={() => setPlanosAberto(true)}>Fazer upgrade</Button>
      </div>

      {planoSolicitado && (
        <div className="mt-4 rounded-sm border border-accent/25 bg-accent/5 p-3 dark:border-accent-light/20 dark:bg-accent-light/10">
          <p className="text-[13px] text-ink dark:text-white">
            Solicitação de upgrade para <strong>{planoSolicitado.nome}</strong> enviada em {formatDateLong(planoSolicitado.solicitadoEm)}. Nosso
            time vai confirmar em breve.
          </p>
        </div>
      )}

      {/* Card principal — plano atual (item 2) */}
      <Card className="mt-4 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={SECTION_LABEL}>Seu plano atual</p>
            <p className="mt-1 text-lg font-bold tracking-[-0.01em] text-ink dark:text-white">Monity Pro — {nomeCurto}</p>
          </div>
          {statusInfo && <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {valorExibido != null && (
            <p className="text-2xl font-bold tracking-[-0.02em] text-ink dark:text-white">
              {formatMoney(valorExibido)}
              <span className="text-xs font-medium text-ink-faint dark:text-white/40"> / {periodoLabel(planoAtual?.periodo).toLowerCase()}</span>
            </p>
          )}
        </div>

        {subscription && subscription.status !== 'canceled' && subscription.current_period_end && (
          <p className="mt-1 text-[13px] text-ink-soft dark:text-white/60">
            Próxima cobrança: <span className="font-medium text-ink dark:text-white">{formatDateLong(subscription.current_period_end)}</span>
          </p>
        )}
        {subscription?.status === 'canceled' && (
          <p className="mt-1 text-[13px] text-ink-soft dark:text-white/60">
            Assinatura cancelada{subscription.canceled_at ? ` em ${formatDateLong(subscription.canceled_at)}` : ''}.
          </p>
        )}

        {/* Uso do plano (item 3) */}
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-medium text-ink dark:text-white">Pacientes</p>
            <p className="text-[13px] font-semibold text-ink dark:text-white">
              {uso.usados} / {uso.limite ?? '∞'}
            </p>
          </div>
          {uso.limite != null && (
            <>
              <div className="mt-2">
                <ProgressBar value={uso.percentual ?? 0} />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-[11.5px] text-ink-faint dark:text-white/40">
                <span>{uso.percentual}% utilizado</span>
                <span>{uso.disponiveis === 0 ? 'Limite atingido' : `${uso.disponiveis} acesso${uso.disponiveis === 1 ? '' : 's'} disponível${uso.disponiveis === 1 ? '' : 'is'}`}</span>
              </div>
            </>
          )}
        </div>

        {alerta && (
          <div
            className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm p-3 ${
              alerta.tone === 'danger' ? 'bg-danger/10' : 'bg-warn/10'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} strokeWidth={2} className={`mt-0.5 shrink-0 ${alerta.tone === 'danger' ? 'text-danger' : 'text-warn'}`} />
              <p className={`text-[13px] ${alerta.tone === 'danger' ? 'text-danger' : 'text-warn'}`}>{alerta.texto}</p>
            </div>
            <Button size="sm" variant={alerta.ctaPrincipal ? 'primary' : 'secondary'} onClick={() => setPlanosAberto(true)}>
              {alerta.ctaPrincipal ? 'Fazer upgrade' : 'Ver planos'}
            </Button>
          </div>
        )}

        {subscription?.status === 'past_due' && (
          <p className="mt-3 text-[12.5px] text-ink-faint dark:text-white/40">
            Ainda não temos um portal de pagamento conectado para atualizar isso automaticamente — nosso time vai entrar em contato.
          </p>
        )}
      </Card>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* O que está incluído (item 8) */}
        <Card className="animate-fade-in">
          <p className={SECTION_LABEL}>O que está incluído no seu plano</p>
          <ul className="mt-3 space-y-2">
            {(planoAtual?.features ?? []).map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-ink-soft dark:text-white/60">
                <CheckCircle2 size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-good" />
                {f}
              </li>
            ))}
            {(!planoAtual || planoAtual.features.length === 0) && <InlineVazio icon={CheckCircle2} texto="Detalhes do plano não disponíveis." />}
          </ul>
        </Card>

        {/* Seu crescimento (item 9) */}
        <Card className="animate-fade-in">
          <p className={`${SECTION_LABEL} flex items-center gap-1.5`}>
            <TrendingUp size={12} strokeWidth={2} />
            Seu crescimento no Monity
          </p>
          <p className="mt-3 text-[13px] text-ink-soft dark:text-white/60">
            Você já está acompanhando {uso.usados} paciente{uso.usados === 1 ? '' : 's'} pelo Monity.
          </p>
          <p className="mt-1 text-[13px] text-ink-soft dark:text-white/60">
            {uso.limite != null ? `Seu plano permite acompanhar até ${uso.limite} pacientes.` : 'Seu plano permite acompanhar pacientes ilimitados.'}
          </p>
          {uso.percentual != null && <p className="mt-2 text-[13px] font-semibold text-ink dark:text-white">{uso.percentual}% da capacidade utilizada</p>}
          {uso.percentual != null && uso.percentual >= 70 && (
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
              <p className="text-[13px] text-ink-soft dark:text-white/60">Você está crescendo. Seu plano está próximo da capacidade máxima.</p>
              <Button size="sm" className="mt-2.5" onClick={() => setPlanosAberto(true)}>
                Fazer upgrade
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Cobrança da assinatura (item 10) */}
      <Card className="mt-4 animate-fade-in">
        <p className={SECTION_LABEL}>Cobrança da assinatura</p>
        {subscription || valorExibido != null ? (
          <dl className="mt-3 space-y-2 text-sm">
            {subscription?.status !== 'canceled' && subscription?.current_period_end && (
              <div className="flex justify-between">
                <dt className="text-ink-soft dark:text-white/60">Próxima cobrança</dt>
                <dd className="font-medium text-ink dark:text-white">{formatDateLong(subscription.current_period_end)}</dd>
              </div>
            )}
            {valorExibido != null && (
              <div className="flex justify-between">
                <dt className="text-ink-soft dark:text-white/60">Valor</dt>
                <dd className="font-medium text-ink dark:text-white">{formatMoney(valorExibido)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-soft dark:text-white/60">Periodicidade</dt>
              <dd className="font-medium text-ink dark:text-white">{periodoLabel(planoAtual?.periodo)}</dd>
            </div>
          </dl>
        ) : (
          <InlineVazio icon={Receipt} texto="Informações de cobrança ainda não disponíveis." />
        )}
        <p className="mt-3 text-[12px] text-ink-faint dark:text-white/40">
          Forma de pagamento e portal de autoatendimento chegam junto com a integração de pagamento — ainda não conectada.
        </p>
      </Card>

      {/* Histórico de pagamentos (item 12) — sem tabela de cobrança real
          ainda (nenhum gateway integrado), então é sempre este estado. */}
      <Card className="mt-4 animate-fade-in">
        <p className={SECTION_LABEL}>Histórico de pagamentos</p>
        <InlineVazio icon={Receipt} texto="Seu histórico aparecerá aqui." />
      </Card>

      {/* Gerenciar assinatura / cancelamento discreto (item 13) */}
      <Card className="mt-4 animate-fade-in">
        <p className={SECTION_LABEL}>Gerenciar assinatura</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => setPlanosAberto(true)}>
            Alterar plano
          </Button>
          <Button variant="ghost" size="sm" disabled title="Disponível quando a integração de pagamento estiver conectada.">
            <CreditCard size={14} strokeWidth={2} />
            Gerenciar pagamento
          </Button>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/5">
          <p className="text-xs text-ink-faint dark:text-white/40">
            Precisa encerrar sua assinatura?{' '}
            <button onClick={() => setCancelarAberto(true)} className="font-medium text-ink-soft underline hover:text-ink dark:text-white/60 dark:hover:text-white">
              Cancelar assinatura
            </button>
          </p>
        </div>
      </Card>

      <PlanosModal open={planosAberto} onClose={() => setPlanosAberto(false)} catalogo={catalogo} planoAtualId={planoAtual?.id ?? null} />
      <CancelarAssinaturaModal open={cancelarAberto} onClose={() => setCancelarAberto(false)} />
    </div>
  );
}
