import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

/* Placeholder (Sprint 3.4 — redesign premium): "Mensagens" entrou no
   menu pela densidade/estrutura que o produto precisa transmitir,
   mas não existe backend de chat ainda — sem inventar dado ou prazo,
   só uma tela de "em breve" de verdade. */
export default function MensagensPage() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Mensagens"
      description="Em breve você vai poder conversar com seus pacientes direto por aqui."
    />
  );
}
