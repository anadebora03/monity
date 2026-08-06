import { Activity, ArrowUpRight, Droplet, FileText, ListChecks, Scale, Syringe } from "lucide-react";
import type { ShowcaseScreen } from "@/lib/content";

function ScreenChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-4 p-4 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{title}</p>
      {children}
    </div>
  );
}

function MiniBars({ values }: { values: number[] }) {
  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-accent to-accent-light"
          style={{ height: `${v}%`, opacity: 0.55 + (i / values.length) * 0.45 }}
        />
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-2 p-3">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-accent" />
        {trend && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-good">
            <ArrowUpRight className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="mt-2 text-lg font-bold text-ink-1">{value}</p>
      <p className="text-[10px] text-ink-3">{label}</p>
    </div>
  );
}

function DashboardScreen() {
  return (
    <ScreenChrome title="Dashboard">
      <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-deep p-4 text-white shadow-[var(--shadow-md)]">
        <p className="text-[10px] uppercase tracking-wide text-white/70">Próxima aplicação</p>
        <p className="mt-1 text-xl font-bold">Quinta-feira</p>
        <p className="text-[11px] text-white/80">em 2 dias</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={Scale} label="Peso atual" value="78,4 kg" trend="-3,1%" />
        <StatCard icon={Syringe} label="Aplicações" value="12" />
      </div>
      <div className="rounded-2xl border border-border bg-bg-2 p-3">
        <p className="text-[10px] text-ink-3">Evolução · 8 semanas</p>
        <MiniBars values={[70, 62, 66, 55, 58, 46, 40, 32]} />
      </div>
    </ScreenChrome>
  );
}

function PesoScreen() {
  return (
    <ScreenChrome title="Peso">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-ink-1">78,4</span>
        <span className="text-sm text-ink-3">kg</span>
        <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-good">
          <ArrowUpRight className="h-3.5 w-3.5" />
          -5,2 kg
        </span>
      </div>
      <div className="rounded-2xl border border-border bg-bg-2 p-3">
        <MiniBars values={[82, 80, 78, 75, 74, 71, 68, 60, 55, 48, 42, 35]} />
        <div className="mt-2 flex justify-between text-[9px] text-ink-3">
          <span>Jan</span>
          <span>Fev</span>
          <span>Mar</span>
          <span>Abr</span>
        </div>
      </div>
      <div className="space-y-2">
        {["Hoje, 07:40", "22 mar, 08:10", "15 mar, 07:55"].map((d) => (
          <div key={d} className="flex items-center justify-between rounded-xl border border-border bg-bg-2 px-3 py-2 text-[11px]">
            <span className="text-ink-2">{d}</span>
            <span className="font-semibold text-ink-1">78,4 kg</span>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}

function ExamesScreen() {
  const exams = [
    { name: "Glicemia em jejum", value: "84 mg/dL", status: "good" as const },
    { name: "HbA1c", value: "5,4%", status: "good" as const },
    { name: "Colesterol total", value: "192 mg/dL", status: "warn" as const },
  ];
  return (
    <ScreenChrome title="Exames">
      <div className="space-y-2.5">
        {exams.map((e) => (
          <div key={e.name} className="flex items-center gap-3 rounded-2xl border border-border bg-bg-2 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-ink-1">{e.name}</p>
              <p className="text-[10px] text-ink-3">{e.value}</p>
            </div>
            <span
              className={
                "h-2 w-2 shrink-0 rounded-full " + (e.status === "good" ? "bg-good" : "bg-warn")
              }
            />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-ink-3">
        + Adicionar novo exame
      </div>
    </ScreenChrome>
  );
}

function BioimpedanciaScreen() {
  const rows = [
    { icon: Activity, label: "Massa magra", value: "58,2 kg" },
    { icon: Droplet, label: "Água corporal", value: "51%" },
    { icon: Scale, label: "Gordura corporal", value: "24,1%" },
  ];
  return (
    <ScreenChrome title="Bioimpedância">
      <div className="flex items-center justify-center py-2">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[6px] border-accent-soft">
          <div
            className="absolute inset-0 rounded-full border-[6px] border-accent"
            style={{ clipPath: "polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 20% 100%)" }}
          />
          <span className="text-lg font-bold text-ink-1">24,1%</span>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 rounded-2xl border border-border bg-bg-2 p-3">
            <r.icon className="h-4 w-4 text-accent" />
            <span className="flex-1 text-[11px] text-ink-2">{r.label}</span>
            <span className="text-[11px] font-semibold text-ink-1">{r.value}</span>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}

function PlanoScreen() {
  const tasks = [
    { label: "Registrar aplicação de hoje", done: true },
    { label: "Atualizar peso da semana", done: true },
    { label: "Agendar exame de rotina", done: false },
    { label: "Revisar meta do mês", done: false },
  ];
  return (
    <ScreenChrome title="Plano de ação">
      <div className="rounded-2xl border border-border bg-bg-2 p-3">
        <p className="text-[10px] text-ink-3">Meta atual</p>
        <p className="mt-1 text-sm font-semibold text-ink-1">Chegar aos 74 kg até junho</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-accent-soft">
          <div className="h-full w-[62%] rounded-full bg-accent" />
        </div>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-bg-2 px-3 py-2.5">
            <span
              className={
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
                (t.done ? "border-good bg-good" : "border-border")
              }
            >
              {t.done && <ListChecks className="h-2.5 w-2.5 text-white" />}
            </span>
            <span className={"text-[11px] " + (t.done ? "text-ink-3 line-through" : "text-ink-2")}>{t.label}</span>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}

const screenComponents: Record<ShowcaseScreen["id"], React.ComponentType> = {
  dashboard: DashboardScreen,
  peso: PesoScreen,
  exames: ExamesScreen,
  bioimpedancia: BioimpedanciaScreen,
  plano: PlanoScreen,
};

export function MockupScreen({ variant }: { variant: ShowcaseScreen["id"] }) {
  const Screen = screenComponents[variant];
  return <Screen />;
}
