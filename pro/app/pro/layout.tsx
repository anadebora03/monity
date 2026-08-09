import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProShell } from '@/components/ProShell';
import { listarPacientes } from '@/lib/patients';

/* Shell protegido de /pro/* — o middleware já bloqueia quem não tem
   professional_profiles (ver lib/supabase/middleware.ts), então
   chegar até aqui já significa "é um profissional autenticado". Este
   layout busca o nome do Workspace pra cabeçalho da sidebar e, desde
   a Sprint 3.4 (redesign premium), a especialidade (subtítulo do
   rodapé/avatar) e a lista de pacientes — usada pela busca do Header,
   reaproveitando listarPacientes() já existente em vez de duplicar a
   query em cada página. */
export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: workspace }, { data: profile }, pacientes] = await Promise.all([
    supabase.from('workspaces').select('nome').eq('owner_id', user.id).maybeSingle(),
    supabase.from('professional_profiles').select('nome, foto_url, especialidade').eq('id', user.id).maybeSingle(),
    listarPacientes(supabase),
  ]);

  return (
    <ProShell
      nome={profile?.nome || user.email || 'Profissional'}
      workspaceName={workspace?.nome ?? 'Seu consultório'}
      fotoUrl={profile?.foto_url}
      especialidade={profile?.especialidade}
      pacientes={pacientes}
    >
      {children}
    </ProShell>
  );
}
