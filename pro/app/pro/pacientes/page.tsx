import { Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export default function PacientesPage() {
  return (
    <EmptyState
      icon={Users}
      title="Nenhum paciente vinculado ainda"
      description="Quando você convidar e um paciente aceitar, ele aparece aqui."
    />
  );
}
