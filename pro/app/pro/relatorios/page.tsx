import { createClient } from '@/lib/supabase/server';
import { listarEmissoes } from '@/lib/report-data';
import { RelatoriosView } from '@/components/RelatoriosView';

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const emissoes = await listarEmissoes(supabase);
  return <RelatoriosView emissoes={emissoes} />;
}
