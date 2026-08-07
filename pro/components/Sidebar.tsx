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

export function Sidebar({ nome, workspaceName }: { nome: string; workspaceName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-100 bg-white dark:border-white/5 dark:bg-navy-soft">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <Logo size={30} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-[-0.01em] text-ink dark:text-white">Monity Pro</p>
          <p className="truncate text-[11px] text-ink-faint dark:text-white/40">{workspaceName}</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-0.5 px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/pro' ? pathname === '/pro' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm font-medium tracking-[-0.005em] transition duration-150 ease-out ${
                active
                  ? 'bg-accent-gradient-soft text-accent dark:bg-accent-light/15 dark:text-accent-light'
                  : 'text-ink-soft hover:bg-slate-50 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4 dark:border-white/5">
        <div className="mb-1 flex items-center gap-2.5 rounded-sm px-2 py-2">
          <Avatar nome={nome} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink dark:text-white">{nome}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-sm px-3.5 py-2 text-sm font-medium text-ink-soft transition duration-150 ease-out hover:bg-slate-50 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <LogOut size={18} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
