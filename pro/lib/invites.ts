'use server';

import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/url';

/* Código do convite = o "token" da URL (/convite/CODIGO). Gerado no
   servidor (nunca no navegador) com crypto.randomBytes — mesmo nível
   de entropia já desenhado no blueprint original da Sprint 015 (rascunho
   de compartilhamento), 12 bytes em base64url dá ~2 bilhões de vezes mais
   combinações que um código de 6 caracteres, curto o bastante pra caber
   numa URL curta. */
function gerarCodigo(): string {
  return crypto.randomBytes(12).toString('base64url');
}

export type Convite = {
  id: string;
  code: string;
  nome: string | null;
  email: string | null;
  status: 'pending' | 'active' | 'declined' | 'ended';
  invitedAt: string;
  acceptedAt: string | null;
};

export async function criarConvite(nome: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).maybeSingle();
  if (!workspace) return { ok: false as const, error: 'Workspace não encontrado.' };

  // Sprint Assinatura (item 4/15 — limite de pacientes do plano): checagem
  // de UX aqui, pra dar feedback imediato sem nem gerar o convite. A trava
  // que realmente vale é dentro de redeem_workspace_invite() (schema_pro_030.sql,
  // SECURITY DEFINER) — esta aqui só evita o profissional gastar um convite
  // que nunca poderia ser aceito.
  const { data: usage } = await supabase
    .from('workspace_patient_usage')
    .select('patient_limit, patients_used')
    .eq('workspace_id', workspace.id)
    .maybeSingle();
  if (usage?.patient_limit != null && usage.patients_used >= usage.patient_limit) {
    return { ok: false as const, error: 'Seu plano atingiu o limite de pacientes. Faça upgrade para convidar mais pacientes.' };
  }

  // Sprint 3.2 (item 15 — impedir duplicidade): sem isso, convidar o
  // mesmo e-mail duas vezes criava dois convites "pending" em paralelo
  // — nenhum dos dois é tecnicamente um vínculo ainda, então o índice
  // único de patient_relationships (que só vale a partir de
  // status='active') não pegava esse caso.
  const { data: pendente } = await supabase
    .from('patient_relationships')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('patient_email', email)
    .eq('status', 'pending')
    .maybeSingle();
  if (pendente) return { ok: false as const, error: 'Já existe um convite pendente para este e-mail.' };

  // colisão de 12 bytes aleatórios é astronomicamente improvável, mas o
  // índice único garante que nunca duplicaria silenciosamente mesmo assim —
  // uma tentativa extra é a resposta correta e barata pra esse caso raro.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const code = gerarCodigo();
    const { error } = await supabase.from('patient_relationships').insert({
      workspace_id: workspace.id,
      invited_by: user.id,
      code,
      patient_email: email,
      nome_convidado: nome || null,
      status: 'pending',
    });
    // Sprint 3.3 (TESTE A, bug 1): o link é montado aqui, no servidor,
    // via getAppBaseUrl() — nunca mais no client com
    // window.location.origin (pro/lib/url.ts explica a ordem de
    // prioridade). Único ponto que gera link de convite no app inteiro.
    if (!error) return { ok: true as const, code, link: `${getAppBaseUrl()}/convite/${code}` };
    if (!String(error.message).includes('duplicate')) {
      return { ok: false as const, error: 'Não foi possível criar o convite. Tente novamente.' };
    }
  }
  return { ok: false as const, error: 'Não foi possível gerar um código único. Tente novamente.' };
}

/* Cancelar convite pendente (Sprint 3.2, item 14) — mesmo mecanismo
   de encerrarAcompanhamento (pro/app/pro/pacientes/[id]/actions.ts):
   a policy "update_linked" só aceita UPDATE quando o resultado final
   é status='ended', então cancelar um convite e encerrar um vínculo
   ativo usam exatamente a mesma trava de RLS. O filtro
   .eq('status','pending') aqui é só pra não deixar cancelar por
   engano um convite que já foi aceito/recusado. */
export async function cancelarConvite(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado.' };

  const { error } = await supabase
    .from('patient_relationships')
    .update({ status: 'ended', ended_at: new Date().toISOString(), ended_reason: 'Convite cancelado pelo profissional' })
    .eq('id', id)
    .eq('status', 'pending');

  if (error) return { ok: false as const, error: 'Não foi possível cancelar o convite. Tente novamente.' };
  return { ok: true as const };
}

export async function listarConvites(): Promise<Convite[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('patient_relationships')
    .select('id, code, nome_convidado, patient_email, status, invited_at, accepted_at, patient_id')
    .order('invited_at', { ascending: false });

  if (!data || data.length === 0) return [];

  // pra convites já aceitos, prefere o nome real do perfil do paciente
  // (o "nome_convidado" foi só o que o profissional digitou de cabeça,
  // pode nem bater com o nome oficial da conta).
  const patientIds = data.filter((r) => r.patient_id).map((r) => r.patient_id as string);
  const nomesReais = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', patientIds);
    (perfis ?? []).forEach((p) => p.nome && nomesReais.set(p.id, p.nome));
  }

  return data.map((r) => ({
    id: r.id,
    code: r.code,
    nome: (r.patient_id && nomesReais.get(r.patient_id)) || r.nome_convidado,
    email: r.patient_email,
    status: r.status,
    invitedAt: r.invited_at,
    acceptedAt: r.accepted_at,
  }));
}
