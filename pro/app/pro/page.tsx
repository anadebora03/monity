import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/dashboard';
import { DashboardView } from '@/components/DashboardView';

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
  const d = await getDashboardData(supabase, user!.id);

  return <DashboardView nome={nome} d={d} />;
}
