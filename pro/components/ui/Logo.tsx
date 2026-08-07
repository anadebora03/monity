/* Ícone oficial Monity (M + check), exportado de assets/brand/master
   via assets/brand/export — nunca desenhar a marca à mão aqui, a
   fonte é sempre o arquivo master. Ver assets/brand/README.md. */
export function Logo({ size = 32 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/monity-icon.png" alt="Monity" width={size} height={size} style={{ borderRadius: size * 0.22 }} />;
}
