import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';

/* Ainda sem edição nesta sprint (não pedida) — só um resumo somente
   leitura do que já foi criado no onboarding, confirmando pro
   profissional que os dados foram salvos corretamente. */
export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('nome, profession_id, professions ( nome )')
    .eq('id', user!.id)
    .maybeSingle();

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('nome, status, plans ( nome )')
    .eq('owner_id', user!.id)
    .maybeSingle();

  const professionName = (profile?.professions as unknown as { nome: string } | null)?.nome;
  const planName = (workspace?.plans as unknown as { nome: string } | null)?.nome;

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="text-xl font-bold tracking-[-0.01em] text-ink">Configurações</h1>
      <p className="mt-1 text-sm text-ink-soft">Dados do seu perfil e do seu Workspace.</p>

      <Card className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Profissional</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Nome</dt>
            <dd className="font-medium text-ink">{profile?.nome || user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">E-mail</dt>
            <dd className="font-medium text-ink">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Profissão</dt>
            <dd className="font-medium text-ink">{professionName ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint">Workspace</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Nome</dt>
            <dd className="font-medium text-ink">{workspace?.nome ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Plano</dt>
            <dd className="font-medium text-ink">{planName ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Status</dt>
            <dd className="font-medium capitalize text-ink">{workspace?.status ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <p className="mt-6 text-xs text-ink-faint">Edição de perfil e assinatura chegam em sprints futuras.</p>
    </div>
  );
}
