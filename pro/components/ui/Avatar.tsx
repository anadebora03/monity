export function Avatar({ nome, size = 36, fotoUrl }: { nome: string; size?: number; fotoUrl?: string | null }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar vem de URL pública do Storage, dimensão variável por call site
    return (
      <img
        src={fotoUrl}
        alt={nome}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-gradient font-semibold text-white"
    >
      {iniciais}
    </div>
  );
}
