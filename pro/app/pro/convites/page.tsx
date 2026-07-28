import { Mail } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ConvitesPage() {
  return (
    <EmptyState
      icon={Mail}
      title="Nenhum convite enviado"
      description="Gerar e enviar convites chega na próxima etapa do Compasso Pro."
    />
  );
}
