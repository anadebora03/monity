export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      {/* mesmo gradiente accent -> accent-light do .bar-glass/.pen2 do
          app do paciente — luz correndo pela barra, não uma cor sólida. */}
      <div className="h-full rounded-full bg-accent-gradient transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
