import { ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { PlanoItem } from '@/lib/patient-detail';

export function PlanoAcaoCard({ itens }: { itens: PlanoItem[] }) {
  return (
    <Card className="animate-fade-in">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Plano de ação</p>
      </div>
      <p className="mt-1 text-xs text-ink-faint dark:text-white/40">Gerado automaticamente a partir dos dados sincronizados.</p>
      {itens.length === 0 ? (
        <div className="mt-4 flex flex-col items-center py-4 text-center">
          <ListChecks size={20} strokeWidth={1.8} className="text-ink-faint dark:text-white/30" />
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">Nada pedindo atenção agora.</p>
        </div>
      ) : (
        <ul className="mt-3.5 space-y-3">
          {itens.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Badge tone={item.prioridade === 'alta' ? 'danger' : 'warn'}>{item.prioridade === 'alta' ? 'Alta' : 'Média'}</Badge>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink dark:text-white">{item.titulo}</p>
                <p className="text-[13px] text-ink-soft dark:text-white/60">{item.descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
