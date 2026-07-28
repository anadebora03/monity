import { UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

/* Dashboard — Sprint 016 pede explicitamente que ainda não seja
   funcional, só o estado vazio de boas-vindas logo após o onboarding
   ("Bem-vindo... convidando seu primeiro paciente"). O botão não
   precisa funcionar ainda (Convites é a Sprint 017) — por isso é
   `disabled` em vez de linkar pra uma rota que ainda não faz nada. */
export default function DashboardPage() {
  return (
    <EmptyState
      icon={UserPlus}
      title="Bem-vindo ao Compasso Pro"
      description="Seu ambiente foi criado com sucesso. Agora vamos começar convidando seu primeiro paciente."
      action={
        <button
          disabled
          title="Disponível em breve"
          className="cursor-not-allowed rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white opacity-60"
        >
          Convidar primeiro paciente
        </button>
      }
    />
  );
}
