import { CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

/* Placeholder (Sprint 3.4 — redesign premium): ver comentário em
   mensagens/page.tsx — mesmo motivo, mesma abordagem. Troca de plano
   e cobrança continuam vivendo em Configurações por enquanto (dado
   real já existe lá); esta rota só existe pra dar ao item "Assinatura"
   do brief um lugar próprio no menu. */
export default function AssinaturaPage() {
  return (
    <EmptyState
      icon={CreditCard}
      title="Assinatura"
      description="Em breve você vai poder gerenciar seu plano e forma de pagamento por aqui."
    />
  );
}
