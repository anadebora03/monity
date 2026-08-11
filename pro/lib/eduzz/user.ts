import type { SupabaseClient } from '@supabase/supabase-js';

/* Localiza a conta do comprador pelo e-mail (normalizado — nunca
   comparar e-mail sem lowercase/trim) ou cria uma nova via convite
   nativo do Supabase (Admin API), decisão confirmada na Sprint
   Integração Eduzz: sem senha definida por ninguém aqui, a pessoa
   define a própria senha pelo link do e-mail de convite.

   NÃO VERIFICADO EM PRODUÇÃO ainda (documentar, não inventar): o
   comportamento exato de `inviteUserByEmail` quando o e-mail já tem
   conta pode variar entre versões do supabase-js — algumas retornam
   erro ("User already registered"), a intenção aqui é: se a invite
   falhar por QUALQUER motivo, cair pro fallback de busca por e-mail
   via listUsers() paginado (a Admin API não tem um "getUserByEmail"
   direto). Ajustar este fallback é o primeiro lugar a olhar se o
   teste de compra do item 17/18 falhar em "usuário identificado". */
export async function findOrInviteBuyer(supabase: SupabaseClient, email: string, nome?: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: nome ? { nome } : undefined,
  });
  if (!inviteError && invited?.user) return invited.user.id;

  const existingId = await findUserIdByEmail(supabase, normalizedEmail);
  if (existingId) return existingId;

  throw new Error(`Não foi possível localizar nem criar conta para ${normalizedEmail}: ${inviteError?.message ?? 'motivo desconhecido'}`);
}

async function findUserIdByEmail(supabase: SupabaseClient, normalizedEmail: string): Promise<string | null> {
  const PER_PAGE = 200;
  const MAX_PAGES = 20; // teto de segurança (~4000 usuários) — ajustar se a base crescer além disso
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`Falha ao buscar usuário existente: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (found) return found.id;
    if (data.users.length < PER_PAGE) break;
  }
  return null;
}
