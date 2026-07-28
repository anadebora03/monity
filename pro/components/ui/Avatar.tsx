export function Avatar({ nome, size = 36 }: { nome: string; size?: number }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-gradient font-semibold text-white"
    >
      {iniciais}
    </div>
  );
}
