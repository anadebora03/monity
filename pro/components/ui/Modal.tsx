'use client';

import { X } from 'lucide-react';

/* Primitivo novo do kit — nenhuma tela até agora precisava de um
   modal de verdade (só bottom-sheet-like em nenhum lugar ainda).
   Mesmo raio/sombra/fundo dos Cards, só flutuando sobre um backdrop. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-lg border border-slate-100 bg-white p-6 shadow-card dark:border-white/5 dark:bg-navy-soft dark:shadow-card-dark">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-[-0.01em] text-ink dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-faint hover:bg-slate-50 dark:text-white/40 dark:hover:bg-white/5"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
