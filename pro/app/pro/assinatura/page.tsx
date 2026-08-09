import { createClient } from '@/lib/supabase/server';
import { getAssinaturaData } from '@/lib/subscription';
import { AssinaturaView } from '@/components/AssinaturaView';

/* Sprint Assinatura — antes era só o EmptyState placeholder da Sprint
   3.4. getAssinaturaData() já resolve plano/uso/subscription real por
   trás do owner_id autenticado (RLS de sempre: workspaces/subscriptions
   só devolvem a linha do próprio profissional). */
export default async function AssinaturaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getAssinaturaData(supabase, user!.id);

  return <AssinaturaView data={data} />;
}
