'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Mail, FileText, Settings, LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';

const NAV_ITEMS = [
  { href: '/pro', label: 'Dashboard', icon: LayoutDashboard },
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
    <aside className="flex h-screen w-64 flex-col border-r border-slate-100 bg-white">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <Logo size={30} />
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-[-0.01em] text-ink">Compasso Pro</p>
          <p className="truncate text-[11px] text-ink-faint">{workspaceName}</p>
        </div>
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
                  ? 'bg-accent-gradient-soft text-accent'
                  : 'text-ink-soft hover:bg-slate-50 hover:text-ink'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-1 flex items-center gap-2.5 rounded-sm px-2 py-2">
          <Avatar nome={nome} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{nome}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-sm px-3.5 py-2 text-sm font-medium text-ink-soft transition duration-150 ease-out hover:bg-slate-50 hover:text-ink"
        >
          <LogOut size={18} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
