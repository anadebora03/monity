import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProShell } from '@/components/ProShell';

/* Shell protegido de /pro/* — o middleware já bloqueia quem não tem
   professional_profiles (ver lib/supabase/middleware.ts), então
   chegar até aqui já significa "é um profissional autenticado". Este
   layout só busca o nome do Workspace pra cabeçalho da sidebar. */
export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('nome')
    .eq('owner_id', user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('nome, foto_url')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <ProShell nome={profile?.nome || user.email || 'Profissional'} workspaceName={workspace?.nome ?? 'Seu consultório'} fotoUrl={profile?.foto_url}>
      {children}
    </ProShell>
  );
}
