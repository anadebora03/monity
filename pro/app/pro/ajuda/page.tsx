import { HelpCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

/* Placeholder (Sprint 3.4 — redesign premium): ver comentário em
   mensagens/page.tsx — mesmo motivo, mesma abordagem. Sem inventar
   e-mail/WhatsApp de suporte que não foi confirmado. */
export default function AjudaPage() {
  return (
    <EmptyState
      icon={HelpCircle}
      title="Central de ajuda"
      description="Em breve você vai encontrar guias e respostas por aqui."
    />
  );
}
