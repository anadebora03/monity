'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Search, Bell, Settings, LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { PacienteLista } from '@/lib/patients';

/* Header persistente do shell /pro/* (Sprint 3.4 — redesign premium):
   antes só existia uma barra mobile dentro do ProShell, sem nada em
   desktop. Busca é client-side sobre a lista de pacientes já buscada
   pelo layout (listarPacientes(), sem query nova) — Cmd/Ctrl+K foca o
   campo, Enter vai pro primeiro resultado. Sino de notificações é só
   o ícone (não existe sistema de notificações real ainda) — dropdown
   fixo "nenhuma por enquanto" em vez de inventar dado. */
export function Header({
  nome,
  especialidade,
  fotoUrl,
  pacientes,
  onMenuClick,
}: {
  nome: string;
  especialidade?: string | null;
  fotoUrl?: string | null;
  pacientes: PacienteLista[];
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const notifBoxRef = useRef<HTMLDivElement>(null);
  const menuBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearchOpen(false);
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) setSearchOpen(false);
      if (notifBoxRef.current && !notifBoxRef.current.contains(target)) setNotifOpen(false);
      if (menuBoxRef.current && !menuBoxRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = query.trim()
    ? pacientes.filter((p) => p.nome.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  function irParaPaciente(id: string) {
    setQuery('');
    setSearchOpen(false);
    router.push(`/pro/pacientes/${id}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results[0]) irParaPaciente(results[0].id);
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-2.5 dark:border-white/5 dark:bg-navy-soft sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-soft hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5 lg:hidden"
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      <div ref={searchBoxRef} className="relative min-w-0 max-w-sm flex-1">
        <form onSubmit={handleSearchSubmit}>
          <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            type="text"
            placeholder="Buscar paciente..."
            className="w-full rounded-sm border border-slate-100 bg-slate-50/60 py-2 pl-9 pr-11 text-[13px] text-ink outline-none transition duration-150 ease-out placeholder:text-ink-faint focus:border-accent-light focus:bg-white dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:bg-white/[.07]"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[4px] border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-faint dark:border-white/10 dark:bg-white/5 dark:text-white/40 sm:block">
            ⌘K
          </kbd>
        </form>

        {searchOpen && query.trim() && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-sm border border-slate-100 bg-white py-1 shadow-card dark:border-white/10 dark:bg-navy-soft dark:shadow-card-dark">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-ink-faint dark:text-white/40">Nenhum paciente encontrado.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => irParaPaciente(p.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink transition duration-100 hover:bg-slate-50 dark:text-white dark:hover:bg-white/5"
                >
                  <Avatar nome={p.nome} size={22} fotoUrl={p.avatarUrl} />
                  {p.nome}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div ref={notifBoxRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notificações"
            className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-soft transition duration-150 ease-out hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5"
          >
            <Bell size={18} strokeWidth={2} />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-10 mt-1.5 w-64 rounded-sm border border-slate-100 bg-white p-3 shadow-card dark:border-white/10 dark:bg-navy-soft dark:shadow-card-dark">
              <p className="text-[13px] text-ink-soft dark:text-white/60">Nenhuma notificação por enquanto.</p>
            </div>
          )}
        </div>

        <ThemeToggle />

        <div ref={menuBoxRef} className="relative ml-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu da conta"
            className="flex items-center gap-2 rounded-full p-0.5 transition duration-150 ease-out hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <Avatar nome={nome} size={30} fotoUrl={fotoUrl} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1.5 w-52 overflow-hidden rounded-sm border border-slate-100 bg-white py-1 shadow-card dark:border-white/10 dark:bg-navy-soft dark:shadow-card-dark">
              <div className="border-b border-slate-100 px-3 py-2.5 dark:border-white/5">
                <p className="truncate text-[13px] font-semibold text-ink dark:text-white">{nome}</p>
                {especialidade && <p className="truncate text-[11px] text-ink-faint dark:text-white/40">{especialidade}</p>}
              </div>
              <Link
                href="/pro/configuracoes"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-soft transition duration-100 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5"
              >
                <Settings size={15} strokeWidth={2} />
                Configurações
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-soft transition duration-100 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5"
              >
                <LogOut size={15} strokeWidth={2} />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
