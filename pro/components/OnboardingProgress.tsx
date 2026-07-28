export function OnboardingProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-soft">
        <span>
          Passo {step} de {total}
        </span>
        <span>{label}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${i < step ? 'bg-accent' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}
