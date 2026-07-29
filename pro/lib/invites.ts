'use server';

import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

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
    if (!error) return { ok: true as const, code };
    if (!String(error.message).includes('duplicate')) {
      return { ok: false as const, error: 'Não foi possível criar o convite. Tente novamente.' };
    }
  }
  return { ok: false as const, error: 'Não foi possível gerar um código único. Tente novamente.' };
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
