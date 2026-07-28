'use server';

import { createClient } from '@/lib/supabase/server';

/* Único ponto de escrita da criação de profissional + Workspace —
   pedido explícito da Sprint 016 ("associar automaticamente:
   proprietário, plano inicial Start, limite inicial, configurações
   padrão"). Roda com a sessão do próprio profissional (RLS normal,
   nenhum privilégio especial) — as policies "insert_own" de
   professional_profiles e workspaces (schema_pro.sql) já autorizam
   exatamente isso. */
export async function completeOnboarding(professionId: string, nome: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { error: profileError } = await supabase
    .from('professional_profiles')
    .upsert({ id: user.id, nome, profession_id: professionId });
  if (profileError) return { ok: false as const, error: 'Não foi possível salvar seu perfil. Tente novamente.' };

  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { data: startPlan } = await supabase.from('plans').select('id').eq('slug', 'start').maybeSingle();

    const { error: workspaceError } = await supabase.from('workspaces').insert({
      owner_id: user.id,
      nome: `Consultório de ${nome}`,
      plan_id: startPlan?.id ?? null,
      status: 'active',
    });
    if (workspaceError) return { ok: false as const, error: 'Não foi possível criar seu Workspace. Tente novamente.' };
  }

  return { ok: true as const };
}
