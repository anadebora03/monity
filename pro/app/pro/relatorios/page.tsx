import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export default function RelatoriosPage() {
  return (
    <EmptyState
      icon={FileText}
      title="Relatórios em breve"
      description="Assim que você tiver pacientes vinculados, vai poder gerar relatórios em PDF direto daqui."
    />
  );
}
