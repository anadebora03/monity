'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import type { PacienteLista } from '@/lib/patients';

/* Shell responsivo de /pro/* — Sprint 017 pede explicitamente que o
   dashboard funcione em mobile "reorganizando os cards sem perder
   clareza". A sidebar fixa de 256px não cabe numa tela de celular,
   então aqui ela vira uma gaveta (drawer): escondida por padrão
   abaixo de lg, um botão de menu abre por cima do conteúdo com um
   fundo escurecido atrás — mesmo padrão de qualquer SaaS de
   dashboard, não um componente novo por tela.

   Sprint 3.4 (redesign premium): a barra mobile solta virou o Header
   persistente (mesmo componente em qualquer largura, cobre busca/
   notificações/tema/avatar — antes só existia em mobile e só tinha
   hambúrguer+logo). */
export function ProShell({
  nome,
  workspaceName,
  fotoUrl,
  especialidade,
  pacientes,
  children,
}: {
  nome: string;
  workspaceName: string;
  fotoUrl?: string | null;
  especialidade?: string | null;
  pacientes: PacienteLista[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-navy">
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
          <Sidebar nome={nome} workspaceName={workspaceName} fotoUrl={fotoUrl} especialidade={especialidade} />
        </div>
      </div>

      <div className="lg:ml-56">
        <Header nome={nome} especialidade={especialidade} fotoUrl={fotoUrl} pacientes={pacientes} onMenuClick={() => setOpen(true)} />
        {children}
      </div>
    </div>
  );
}
