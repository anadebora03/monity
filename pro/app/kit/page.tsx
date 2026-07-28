import { Users, Calendar, TrendingUp, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, HeroCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';

/* Vitrine do design system do Compasso Pro — não faz parte da
   navegação do produto, é referência viva pra conferir se a
   identidade visual (azul oficial, gradientes de luz, tipografia
   Inter, cards de raio 20-24px) está correta ANTES de aplicar nas
   telas reais. Ver COMPASSO_PRO_BLUEPRINT.md. */
export default function KitPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-8 py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Compasso Pro — UI Kit</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Mesma identidade visual do app do paciente: azul oficial, gradientes de luz, tipografia Inter.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Cor</h2>
        <div className="flex gap-3">
          {[
            ['accent-light', '#4FA0FA'],
            ['accent', '#2E6FC9'],
            ['accent-deep', '#1F4C8F'],
            ['good', '#1F9D6B'],
            ['warn', '#C97F1E'],
            ['danger', '#C24A3A'],
          ].map(([name, hex]) => (
            <div key={name} className="text-center">
              <div className="h-16 w-16 rounded-md shadow-card" style={{ background: hex }} />
              <p className="mt-2 text-[11px] font-medium text-ink-soft">{name}</p>
              <p className="text-[10px] text-ink-faint">{hex}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Hero Card</h2>
        <HeroCard>
          <p className="text-2xl font-bold tracking-[-0.02em] text-ink">Bom dia, Dra. Germana ☀️</p>
          <p className="mt-1.5 text-sm text-ink-soft">Aqui está o resumo do seu acompanhamento hoje.</p>
          <div className="mt-6 flex gap-3">
            <Button>Convidar paciente</Button>
            <Button variant="secondary">Ver relatórios</Button>
          </div>
        </HeroCard>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Botões</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Perigo</Button>
          <Button size="sm">Pequeno</Button>
          <Button disabled>Desabilitado</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Stat cards</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Users} label="Pacientes ativos" value={18} caption="+3 esta semana" />
          <StatCard icon={TrendingUp} label="Evolução positiva" value="12" tone="good" caption="66% do total" />
          <StatCard icon={Bell} label="Precisam de atenção" value={3} tone="warn" caption="16% do total" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Card comum</h2>
        <Card>
          <div className="flex items-center gap-3">
            <Avatar nome="Ana Carolina" />
            <div>
              <p className="text-sm font-semibold text-ink">Ana Carolina</p>
              <p className="text-xs text-ink-faint">Último registro há 2 dias</p>
            </div>
            <Badge tone="warn">Em atenção</Badge>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">Ativo</Badge>
          <Badge tone="good">Em evolução</Badge>
          <Badge tone="warn">Em atenção</Badge>
          <Badge tone="danger">Vencido</Badge>
          <Badge tone="neutral">Neutro</Badge>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Barra de progresso</h2>
        <div className="max-w-xs space-y-1.5">
          <ProgressBar value={72} />
          <p className="text-xs text-ink-faint">18 de 25 pacientes (72%)</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Campo de formulário</h2>
        <div className="max-w-xs space-y-4">
          <Input label="Nome completo" placeholder="Dra. Germana Oliveira" />
          <div className="relative">
            <Input label="Buscar" placeholder="Buscar paciente…" />
            <Search size={16} className="absolute right-3.5 top-[38px] text-ink-faint" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Avatares</h2>
        <div className="flex items-center gap-3">
          <Avatar nome="Germana Oliveira" size={28} />
          <Avatar nome="Ana Carolina" size={36} />
          <Avatar nome="João Pereira" size={48} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Tipografia</h2>
        <div className="space-y-2">
          <p className="text-3xl font-bold tracking-[-0.02em] text-ink">Título grande — 30px / 700</p>
          <p className="text-xl font-bold tracking-[-0.02em] text-ink">Título de tela — 20px / 700</p>
          <p className="text-base font-semibold text-ink">Subtítulo — 16px / 600</p>
          <p className="text-sm text-ink-soft">Corpo de texto — 14px / 400, cor ink-soft</p>
          <p className="text-xs uppercase tracking-[.09em] text-ink-faint">Rótulo — 12px / 600, uppercase</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Item de navegação (sidebar)</h2>
        <div className="max-w-[220px] space-y-1">
          <div className="flex items-center gap-3 rounded-sm bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
            <Calendar size={18} strokeWidth={2} />
            Ativo
          </div>
          <div className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-ink-soft">
            <Calendar size={18} strokeWidth={2} />
            Inativo
          </div>
        </div>
      </section>
    </div>
  );
}
