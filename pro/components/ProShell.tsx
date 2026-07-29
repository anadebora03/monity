'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Logo } from '@/components/ui/Logo';

/* Shell responsivo de /pro/* — Sprint 017 pede explicitamente que o
   dashboard funcione em mobile "reorganizando os cards sem perder
   clareza". A sidebar fixa de 256px não cabe numa tela de celular,
   então aqui ela vira uma gaveta (drawer): escondida por padrão
   abaixo de lg, um botão de menu abre por cima do conteúdo com um
   fundo escurecido atrás — mesmo padrão de qualquer SaaS de
   dashboard, não um componente novo por tela. */
export function ProShell({
  nome,
  workspaceName,
  children,
}: {
  nome: string;
  workspaceName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-navy">
      {/* barra superior — só aparece abaixo de lg */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/5 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-soft hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        <Logo size={26} />
        <span className="text-sm font-bold tracking-[-0.01em] text-ink dark:text-white">Compasso Pro</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 -translate-x-full transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div className="relative h-full">
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5 lg:hidden"
          >
            <X size={18} strokeWidth={2} />
          </button>
          <Sidebar nome={nome} workspaceName={workspaceName} />
        </div>
      </div>

      <div className="lg:ml-64">{children}</div>
    </div>
  );
}
