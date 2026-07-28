import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from './OnboardingWizard';
import type { Profession } from '@/lib/types';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: professions } = await supabase
    .from('professions')
    .select('id, slug, nome, active')
    .eq('active', true)
    .order('nome');

  const nome = (user.user_metadata?.nome as string | undefined) || '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <OnboardingWizard professions={(professions ?? []) as Profession[]} nome={nome} />
      </div>
    </main>
  );
}
