-- ============================================================
-- MONITY · Migração incremental (Sprint 3.2 — Gestão de Pacientes,
-- Vínculos e Permissões)
--
-- IDEMPOTENTE: create or replace, pode rodar quantas vezes for
-- preciso. Depende de schema_pro_028.sql (access_source) já ter
-- rodado antes.
--
-- Por que uma função SECURITY DEFINER e não um UPDATE direto:
-- a policy "update_linked" (schema_pro_026.sql, corrigida na
-- Sprint 034 por um achado de segurança real) só aceita UPDATE em
-- patient_relationships quando o resultado final tem status='ended'
-- — de propósito, pra fechar o buraco onde um profissional
-- conseguia reescrever patient_id/workspace_id direto pela API.
-- Marcar access_source não tem nada a ver com encerrar o vínculo, e
-- não faz sentido afrouxar aquela policy geral só pra isso — o
-- padrão já validado neste schema pra mutações estreitas e
-- específicas é uma função própria (mesmo mecanismo de
-- redeem_workspace_invite/decline_workspace_invite,
-- schema_pro_018.sql).
-- ============================================================

create or replace function set_patient_access_source(p_relationship_id uuid, p_access_source text)
returns patient_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel patient_relationships;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_access_source is not null and p_access_source not in ('professional', 'independent') then
    raise exception 'Origem de acesso inválida';
  end if;

  -- só o dono do workspace (o profissional) marca a origem do acesso —
  -- o paciente não tem ação aqui, é uma anotação do profissional sobre
  -- o que ele sabe/foi informado.
  update patient_relationships pr
    set access_source = p_access_source
    where pr.id = p_relationship_id
      and exists (select 1 from workspaces w where w.id = pr.workspace_id and w.owner_id = auth.uid())
    returning * into v_rel;

  if v_rel.id is null then
    raise exception 'Vínculo não encontrado ou sem permissão';
  end if;

  return v_rel;
end;
$$;

revoke all on function set_patient_access_source(uuid, text) from public;
grant execute on function set_patient_access_source(uuid, text) to authenticated;
