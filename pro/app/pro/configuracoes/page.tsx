import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ConfiguracoesForm } from '@/components/ConfiguracoesForm';
import { ContaForm } from '@/components/ContaForm';

const STATUS_LABEL: Record<string, string> = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso' };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('nome, profession_id, foto_url, crn_crm, especialidade, telefone, cidade, estado, biografia, professions ( nome )')
    .eq('id', user!.id)
    .maybeSingle();

  // "plans!plan_id" desambigua o embed: workspaces ganhou uma segunda FK
  // pra plans (requested_plan_id, Sprint Assinatura) — "plans ( nome )"
  // sozinho passa a ser ambíguo pro PostgREST assim que ela existe.
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('nome, status, plans!plan_id ( nome )')
    .eq('owner_id', user!.id)
    .maybeSingle();

  const professionName = (profile?.professions as unknown as { nome: string } | null)?.nome;
  const planName = (workspace?.plans as unknown as { nome: string } | null)?.nome;

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="text-xl font-bold tracking-[-0.01em] text-ink dark:text-white">Configurações</h1>
      <p className="mt-1 text-sm text-ink-soft dark:text-white/60">Dados do seu perfil e do seu Workspace.</p>

      <Card className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Editar perfil</p>
        <ConfiguracoesForm
          nomeInicial={profile?.nome || user?.email || ''}
          workspaceNomeInicial={workspace?.nome ?? ''}
          fotoUrlInicial={profile?.foto_url ?? null}
          telefoneInicial={profile?.telefone ?? ''}
          crnCrmInicial={profile?.crn_crm ?? ''}
          especialidadeInicial={profile?.especialidade ?? ''}
          cidadeInicial={profile?.cidade ?? ''}
          estadoInicial={profile?.estado ?? ''}
          biografiaInicial={profile?.biografia ?? ''}
        />
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Conta</p>
        <ContaForm emailInicial={user?.email ?? ''} />
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-white/5">
          <div className="flex justify-between">
            <dt className="text-ink-soft dark:text-white/60">Profissão</dt>
            <dd className="font-medium text-ink dark:text-white">{professionName ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[.09em] text-ink-faint dark:text-white/40">Workspace</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft dark:text-white/60">Plano</dt>
            <dd className="font-medium text-ink dark:text-white">{planName ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft dark:text-white/60">Status</dt>
            <dd className="font-medium text-ink dark:text-white">{workspace?.status ? STATUS_LABEL[workspace.status] ?? workspace.status : '—'}</dd>
          </div>
        </dl>
      </Card>

      <p className="mt-6 text-xs text-ink-faint dark:text-white/40">Troca de plano e assinatura chegam em sprints futuras.</p>
    </div>
  );
}
