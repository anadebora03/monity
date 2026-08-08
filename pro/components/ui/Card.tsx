import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-md border border-slate-100 bg-white p-5 shadow-card transition-shadow duration-200 ease-out dark:border-white/5 dark:bg-navy-soft dark:shadow-card-dark ${className}`}
    />
  );
}

/* Cartão de destaque (topo do dashboard, telas de boas-vindas) — o
   único lugar onde o "glow" de fundo aparece por trás do conteúdo,
   igual ao pedido: "gradientes iluminados... fundo do Hero Card". */
export function HeroCard({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`relative overflow-hidden rounded-lg border border-slate-100 bg-hero-gradient p-8 shadow-card dark:border-white/5 dark:bg-hero-gradient-dark dark:shadow-card-dark ${className}`}
    >
      <div className="glow-blob -right-16 -top-24 h-64 w-64" />
      <div className="glow-blob -bottom-20 -left-10 h-56 w-56" />
      <div className="relative">{children}</div>
    </div>
  );
}
