import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const VARIANT_CLASS: Record<Variant, string> = {
  // gradiente sutil (luz atravessando), não um degradê chapado —
  // mesma técnica de .btn-pill do app do paciente (linear-gradient
  // claro -> escuro + sombra colorida com "glow").
  primary: 'bg-accent-gradient text-white shadow-btn hover:brightness-[1.03] active:brightness-[0.98]',
  secondary:
    'bg-white text-accent border border-accent/25 hover:bg-accent/5 hover:border-accent/40 dark:bg-transparent dark:text-accent-light dark:border-accent-light/25 dark:hover:bg-accent-light/10',
  ghost: 'bg-transparent text-ink-soft hover:bg-slate-50 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white',
  danger: 'bg-white text-danger border border-danger/25 hover:bg-danger/5 dark:bg-transparent',
};

const SIZE_CLASS: Record<Size, string> = {
  md: 'px-5 py-2.5 text-sm',
  sm: 'px-3.5 py-1.5 text-xs',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold tracking-[-0.01em] transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
    />
  );
}
