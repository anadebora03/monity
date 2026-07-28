'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Mail, FileText, Settings, LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/pro', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pro/pacientes', label: 'Pacientes', icon: Users },
  { href: '/pro/convites', label: 'Convites', icon: Mail },
  { href: '/pro/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/pro/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          C
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-ink">Compasso Pro</p>
          <p className="truncate text-xs leading-tight text-ink-faint">{workspaceName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/pro' ? pathname === '/pro' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-accent/10 text-accent' : 'text-ink-soft hover:bg-slate-50 hover:text-ink'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-slate-50 hover:text-ink"
        >
          <LogOut size={18} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
