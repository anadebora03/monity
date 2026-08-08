'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/* Autoedição de perfil/workspace (Sprint 034 — fechava a única
   lacuna "sensação de MVP" encontrada na certificação de
   lançamento: Configurações era só leitura). Mesmo padrão de
   `onboarding/actions.ts` — roda com a sessão do próprio
   profissional, RLS normal ("update_own" em professional_profiles e
   workspaces, schema_pro.sql), nenhum privilégio especial. */
export type PerfilProfissionalFields = {
  nome: string;
  workspaceNome: string;
  telefone: string;
  crnCrm: string;
  especialidade: string;
  cidade: string;
  estado: string;
  biografia: string;
};

/* Sprint 3 (Perfis/Configurações): telefone/crnCrm/especialidade/
   cidade/estado/biografia já existiam em professional_profiles desde
   schema_pro_016.sql, sem nenhuma UI que os escrevesse — esta action
   passa a gravar todos, não só nome. */
export async function atualizarPerfil(fields: PerfilProfissionalFields) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const nomeLimpo = fields.nome.trim();
  const workspaceNomeLimpo = fields.workspaceNome.trim();
  if (!nomeLimpo) return { ok: false as const, error: 'O nome não pode ficar em branco.' };
  if (!workspaceNomeLimpo) return { ok: false as const, error: 'O nome do Workspace não pode ficar em branco.' };

  const { error: profileError } = await supabase
    .from('professional_profiles')
    .update({
      nome: nomeLimpo,
      telefone: fields.telefone.trim() || null,
      crn_crm: fields.crnCrm.trim() || null,
      especialidade: fields.especialidade.trim() || null,
      cidade: fields.cidade.trim() || null,
      estado: fields.estado.trim() || null,
      biografia: fields.biografia.trim() || null,
    })
    .eq('id', user.id);
  if (profileError) return { ok: false as const, error: 'Não foi possível salvar seu perfil. Tente novamente.' };

  const { error: workspaceError } = await supabase.from('workspaces').update({ nome: workspaceNomeLimpo }).eq('owner_id', user.id);
  if (workspaceError) return { ok: false as const, error: 'Não foi possível salvar o nome do Workspace. Tente novamente.' };

  // ProShell (sidebar) e Dashboard leem esses nomes num Server Component
  // à parte — sem revalidar, ficariam com o valor antigo em cache até a
  // próxima navegação "dura".
  revalidatePath('/pro', 'layout');

  return { ok: true as const };
}
