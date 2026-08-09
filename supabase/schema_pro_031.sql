-- ============================================================
-- MONITY · Migração incremental (fix urgente — recursão infinita em
-- RLS de platform_admins)
--
-- ACHADO (Sprint Assinatura, ao testar onboarding após aplicar
-- schema_pro_025.sql pela primeira vez em produção): as policies de
-- platform_admins ("select_admin_team", "insert_master",
-- "update_master") fazem `exists (select 1 from platform_admins ...)`
-- de DENTRO de uma policy da PRÓPRIA platform_admins. O Postgres
-- reavalia essa mesma policy pra resolver a subconsulta, entra em
-- loop, e devolve "infinite recursion detected in policy for
-- relation platform_admins" (42P17).
--
-- Isso não é um problema isolado de platform_admins: professional_
-- profiles, workspaces, patient_relationships e profiles ganharam
-- (também em schema_pro_025.sql) uma segunda policy "select_admin"
-- que consulta platform_admins. Toda leitura/escrita nessas tabelas
-- — por QUALQUER profissional ou paciente, não só admin — passa a
-- disparar a RLS de platform_admins como parte da checagem, e
-- portanto o loop. Na prática, com schema_pro_025.sql aplicado sem
-- este fix, o app fica quebrado (onboarding, login, dashboard,
-- pacientes) pra usuários comuns, não só pra telas de admin que
-- ainda nem existem.
--
-- CORREÇÃO: mesma técnica já usada no projeto (redeem_workspace_
-- invite, set_patient_access_source, schema_pro_018.sql/029.sql) —
-- uma função SECURITY DEFINER roda com o privilégio de quem a criou
-- (dono da tabela), que não está sujeito à própria RLS; o "select 1
-- from platform_admins" de dentro dela não reaciona a policy que a
-- chamou. As três policies de platform_admins passam a chamar a
-- função em vez de fazer o subquery inline nelas mesmas. As outras
-- tabelas (select_admin/select_financeiro) não precisam mudar — elas
-- já eram consultas cruzadas normais; só reagiam mal porque a RLS de
-- platform_admins, alvo da consulta, é que recursava.
-- ============================================================

create or replace function is_active_platform_admin(p_user_id uuid, p_roles text[] default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from platform_admins
    where id = p_user_id and active
      and (p_roles is null or role = any(p_roles))
  );
$$;

revoke all on function is_active_platform_admin(uuid, text[]) from public;
grant execute on function is_active_platform_admin(uuid, text[]) to authenticated;

drop policy if exists "select_admin_team" on platform_admins;
create policy "select_admin_team" on platform_admins for select
  using (auth.uid() = id or is_active_platform_admin(auth.uid()));

drop policy if exists "insert_master" on platform_admins;
create policy "insert_master" on platform_admins for insert
  with check (is_active_platform_admin(auth.uid(), array['master']));

drop policy if exists "update_master" on platform_admins;
create policy "update_master" on platform_admins for update
  using (is_active_platform_admin(auth.uid(), array['master']));
