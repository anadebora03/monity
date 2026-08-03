'use client';

/* Porta 1:1 de lineChartPremium() em app.js (mesma matemática de
   layout, mesma curva Catmull-Rom via smoothPath()) — pedido
   explícito da Sprint 019: "Exibir o mesmo gráfico utilizado no
   aplicativo. Não criar outro gráfico." As cores viram variáveis CSS
   setadas por classe Tailwind (claro/escuro) porque o SVG original
   só existia sobre fundo navy; aqui o card pode estar em fundo
   branco (tema claro do Pro) ou navy (tema escuro), então as duas
   paletas precisam existir — a geometria e as curvas são idênticas. */

type Point = { x: string; y: number };

function fmtBR(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
function nf(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6,
      c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6,
      c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
  }
  return d.trim();
}

export function LineChart({ data, goal, unit = 'kg' }: { data: Point[]; goal?: number | null; unit?: string }) {
  if (!data || data.length < 2) {
    return <p className="py-8 text-center text-[13px] text-ink-faint dark:text-white/40">Ainda não há registros suficientes para mostrar o gráfico.</p>;
  }
  const W = 340,
    H = 150,
    pL = 30,
    pR = 8,
    pT = 16,
    pB = 20;
  const hasGoal = goal != null && isFinite(goal);
  const ys = data.map((d) => d.y);
  let min = Math.min(...ys, hasGoal ? goal! : Infinity),
    max = Math.max(...ys, hasGoal ? goal! : -Infinity);
  const range = max - min || 1;
  min -= range * 0.18;
  max += range * 0.18;
  const X = (i: number) => pL + (i / (data.length - 1)) * (W - pL - pR);
  const Y = (v: number) => pT + (1 - (v - min) / (max - min)) * (H - pT - pB);
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.y) }));
  const path = smoothPath(pts);
  const area = `${path} L ${X(data.length - 1).toFixed(1)} ${H - pB} L ${X(0).toFixed(1)} ${H - pB} Z`;

  const steps = 3;
  const gridLines = Array.from({ length: steps + 1 }, (_, i) => {
    const v = min + (max - min) * (i / steps);
    return { y: Y(v), v };
  });

  const gy = hasGoal ? Y(goal!) : null;
  const last = data[data.length - 1],
    lastX = X(data.length - 1),
    lastY = Y(last.y);
  const dots = data.slice(0, -1).map((d, i) => ({ x: X(i), y: Y(d.y) }));

  const ttW = 72,
    ttH = 34,
    ttGap = 9;
  let ttX = lastX - ttW / 2;
  ttX = Math.max(2, Math.min(W - 2 - ttW, ttX));
  const ttY = Math.max(2, lastY - ttH - ttGap);
  const ttCx = ttX + ttW / 2;
  const gradId = `chGrad-${Math.round(lastX * 100)}-${data.length}`;

  return (
    <div className="[--chart-accent:#2E6FC9] [--chart-accent-light:#4FA0FA] [--chart-grid:rgba(15,29,53,.08)] [--chart-axis:rgba(15,29,53,.4)] [--chart-goal:#C97F1E] [--chart-bg:#fff] [--chart-tt-bg:#2E6FC9] [--chart-tt-border:rgba(255,255,255,.3)] dark:[--chart-accent:#4FA0FA] dark:[--chart-accent-light:#8FC7FF] dark:[--chart-grid:rgba(255,255,255,.06)] dark:[--chart-axis:rgba(210,222,238,.4)] dark:[--chart-goal:#E3A94A] dark:[--chart-bg:#182A4A] dark:[--chart-tt-bg:#2A3B57] dark:[--chart-tt-border:rgba(160,195,255,.28)]">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible', shapeRendering: 'geometricPrecision' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--chart-accent)" stopOpacity=".16" />
            <stop offset="1" stopColor="var(--chart-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pL} y1={g.y.toFixed(1)} x2={W - pR} y2={g.y.toFixed(1)} stroke="var(--chart-grid)" strokeWidth=".75" />
            <text x={pL - 6} y={(g.y + 2.8).toFixed(1)} textAnchor="end" fontSize="8" fontWeight="500" fill="var(--chart-axis)">
              {Math.round(g.v)}
            </text>
          </g>
        ))}
        {hasGoal && gy! > pT && gy! < H - pB && (
          <line x1={pL} y1={gy!.toFixed(1)} x2={W - pR} y2={gy!.toFixed(1)} stroke="var(--chart-goal)" strokeWidth=".9" strokeDasharray="2.5 3" opacity=".55" />
        )}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke="var(--chart-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r="1.8" fill="var(--chart-accent)" opacity=".8" />
        ))}
        <line x1={lastX.toFixed(1)} y1={(ttY + ttH).toFixed(1)} x2={lastX.toFixed(1)} y2={(lastY - 7).toFixed(1)} stroke="var(--chart-axis)" strokeWidth="1.25" opacity=".5" />
        <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="5" fill="var(--chart-bg)" stroke="var(--chart-accent-light)" strokeWidth="2" />
        <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="1.8" fill="var(--chart-accent-light)" />
        <rect x={ttX.toFixed(1)} y={ttY.toFixed(1)} width={ttW} height={ttH} rx="10" fill="var(--chart-tt-bg)" stroke="var(--chart-tt-border)" strokeWidth="1" />
        <text x={ttCx.toFixed(1)} y={(ttY + 14).toFixed(1)} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
          {nf(last.y)}
          {unit ? ` ${unit}` : ''}
        </text>
        <text x={ttCx.toFixed(1)} y={(ttY + 26).toFixed(1)} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,.75)">
          {fmtBR(last.x)}
        </text>
        <text x={X(0).toFixed(1)} y={H - 4} fontSize="8.5" fontWeight="500" fill="var(--chart-axis)">
          {fmtBR(data[0].x)}
        </text>
        <text x={X(data.length - 1).toFixed(1)} y={H - 4} textAnchor="end" fontSize="8.5" fontWeight="500" fill="var(--chart-axis)">
          {fmtBR(data[data.length - 1].x)}
        </text>
      </svg>
    </div>
  );
}
