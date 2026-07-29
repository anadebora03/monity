import { createClient } from '@/lib/supabase/server';
import { listarPacientes } from '@/lib/patients';
import { PacientesView } from '@/components/PacientesView';

export default async function PacientesPage() {
  const supabase = await createClient();
  const pacientes = await listarPacientes(supabase);
  return <PacientesView pacientes={pacientes} />;
}
