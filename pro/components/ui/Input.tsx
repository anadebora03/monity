import type { InputHTMLAttributes } from 'react';

export function Input({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium tracking-[-0.005em] text-ink">{label}</span>
      <input
        {...props}
        className={`w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent/10 ${className}`}
      />
    </label>
  );
}
