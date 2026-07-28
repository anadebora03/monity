import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { HeroCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* Dashboard — Sprint 016 pede explicitamente que ainda não seja
   funcional (sem paciente, sem métrica de verdade ainda existe), mas
   a revisão de identidade visual pede um tom conversacional ("Bom
   dia, Dra. X"). As duas coisas cabem juntas: saudação de verdade
   (nome real, hora real) + o MESMO estado vazio de sempre — sem
   inventar número de paciente nenhum, que seria dado fabricado. */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('nome')
    .eq('id', user!.id)
    .maybeSingle();

  const nome = profile?.nome?.split(' ')[0] || 'por aqui';

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <HeroCard>
        <p className="text-2xl font-bold tracking-[-0.02em] text-ink">
          {saudacao()}, {nome} 👋
        </p>
        <p className="mt-1.5 text-sm text-ink-soft">Seu ambiente foi criado com sucesso.</p>
      </HeroCard>

      <div className="mt-4">
        <EmptyState
          icon={UserPlus}
          title="Vamos começar convidando seu primeiro paciente"
          description="Assim que você convidar e um paciente aceitar, o acompanhamento aparece aqui."
          action={
            <Button disabled title="Disponível em breve">
              Convidar primeiro paciente
            </Button>
          }
        />
      </div>
    </div>
  );
}
