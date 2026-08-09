'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Settings,
  LogOut,
  CalendarDays,
  MessageSquare,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { signOut } from '@/lib/auth';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';

/* Grupos em vez de lista plana (Sprint 3.4 — redesign premium): a
   densidade/hierarquia do menu é uma das coisas que mais reforça a
   sensação de "produto completo" — labels de grupo reaproveitam a
   mesma classe já usada pros títulos de seção do Dashboard. */
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/pro', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pro/pacientes', label: 'Pacientes', icon: Users },
      { href: '/pro/agenda', label: 'Agenda', icon: CalendarDays },
      { href: '/pro/relatorios', label: 'Relatórios', icon: FileText },
      { href: '/pro/convites', label: 'Convites', icon: Mail },
      { href: '/pro/mensagens', label: 'Mensagens', icon: MessageSquare },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/pro/assinatura', label: 'Assinatura', icon: CreditCard },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/pro/configuracoes', label: 'Configurações', icon: Settings },
      { href: '/pro/ajuda', label: 'Ajuda', icon: HelpCircle },
    ],
  },
];

export function Sidebar({
  nome,
  workspaceName,
  fotoUrl,
  especialidade,
}: {
  nome: string;
  workspaceName: string;
  fotoUrl?: string | null;
  especialidade?: string | null;
}) {
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
      </div>

      <nav className="flex-1 px-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label} className={i > 0 ? 'mt-4' : ''}>
            <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map(({ href, label, icon: Icon }) => {
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
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-white/5">
        <div className="mb-0.5 flex items-center gap-2 rounded-xs px-1.5 py-1.5">
          <Avatar nome={nome} size={28} fotoUrl={fotoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink dark:text-white">{nome}</p>
            {especialidade && (
              <p className="truncate text-[10.5px] text-ink-faint dark:text-white/40">{especialidade}</p>
            )}
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
