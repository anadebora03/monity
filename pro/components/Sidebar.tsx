'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Mail, FileText, Settings, LogOut, CalendarDays } from 'lucide-react';
import { signOut } from '@/lib/auth';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/pro', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pro/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/pro/pacientes', label: 'Pacientes', icon: Users },
  { href: '/pro/convites', label: 'Convites', icon: Mail },
  { href: '/pro/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/pro/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ nome, workspaceName, fotoUrl }: { nome: string; workspaceName: string; fotoUrl?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-100 bg-white dark:border-white/5 dark:bg-navy-soft">
      <div className="flex items-center gap-2 px-4 py-4">
        <Logo size={24} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-[-0.01em] text-ink dark:text-white">Monity Pro</p>
          <p className="truncate text-[10.5px] text-ink-faint dark:text-white/40">{workspaceName}</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-px px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/pro' ? pathname === '/pro' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-xs px-3 py-2 text-[13px] font-medium tracking-[-0.005em] transition duration-150 ease-out ${
                active
                  ? 'bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light'
                  : 'text-ink-soft hover:bg-slate-50 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-white/5">
        <div className="mb-0.5 flex items-center gap-2 rounded-xs px-1.5 py-1.5">
          <Avatar nome={nome} size={28} fotoUrl={fotoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink dark:text-white">{nome}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xs px-3 py-1.5 text-[13px] font-medium text-ink-soft transition duration-150 ease-out hover:bg-slate-50 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <LogOut size={16} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
