-- ============================================================
-- MONITY · Exclusão real de conta (Sprint — Isolamento total de dados)
-- Rode este arquivo no SQL Editor do Supabase. Idempotente.
--
-- Diferente do reset de dados (soft-delete via wipeServerData(),
-- js/database.js), isto apaga a linha em auth.users de verdade — a
-- pessoa não consegue mais logar com aquele e-mail. Nenhuma policy
-- de RLS permite ao cliente apagar de auth.users diretamente (schema
-- protegido do Supabase), então a única forma seria uma Edge Function
-- com a service role key, ou — mais simples e consistente com o
-- padrão já usado no projeto (ver redeem_workspace_invite() em
-- schema_pro.sql) — uma função SECURITY DEFINER: roda com o
-- privilégio de quem criou a função (o dono do projeto), mas só
-- apaga a linha do PRÓPRIO auth.uid() do usuário que a chamou, nunca
-- um id arbitrário vindo do cliente.
--
-- Todas as 8 tabelas do paciente já têm
-- "user_id/id references auth.users(id) on delete cascade" —
-- apagar a linha em auth.users já apaga profile/pesagens/aplicações/
-- diário/exames/bioimpedância/agenda/caneta em cascata, sem precisar
-- repetir isso aqui.
-- ============================================================

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;
