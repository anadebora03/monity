/* Mesma marca do app do paciente (ver logoSVG() em app.js) — anel
   parcial + seringa na diagonal — portada pra cá com as cores fixas
   do Pro (não dá pra usar var(--accent) porque os dois projetos não
   compartilham CSS, mas os valores hex são os mesmos). Reforça
   "mesma identidade visual" pelo próprio ícone, não só pela cor. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#logoBg)" />
      <circle
        cx="20"
        cy="20"
        r="12"
        stroke="url(#logoRing)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="56 76"
        strokeDashoffset="6"
        transform="rotate(-90 20 20)"
      />
      <g transform="rotate(45 20 20)">
        <rect x="18.4" y="8" width="3.2" height="2.6" rx="1" fill="#fff" />
        <rect x="17.4" y="10.6" width="5.2" height="2.2" rx="1" fill="#fff" />
        <rect x="18.1" y="12.8" width="3.8" height="11.2" rx="1.2" fill="#fff" />
        <polygon points="18.2,24 21.8,24 20,32" fill="#fff" />
      </g>
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4FA0FA" />
          <stop offset="1" stopColor="#2E6FC9" />
        </linearGradient>
        <linearGradient id="logoRing" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
        </linearGradient>
      </defs>
    </svg>
  );
}
