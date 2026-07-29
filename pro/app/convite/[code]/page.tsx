import { createClient } from '@/lib/supabase/server';
import { InviteFlow } from './InviteFlow';

type PreviewRow = {
  status: 'pending' | 'active' | 'declined' | 'ended';
  profissional_nome: string | null;
  profissao_nome: string | null;
  workspace_nome: string | null;
};

export default async function ConvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_invite_preview', { p_code: code });
  const preview = (data as PreviewRow[] | null)?.[0] ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <InviteFlow code={code} preview={preview} jaAutenticado={!!user} />;
}
