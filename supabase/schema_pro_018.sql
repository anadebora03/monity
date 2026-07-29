-- ============================================================
-- COMPASSO PRO · Migração incremental (Sprint 018 — Convites)
-- Rode no SQL Editor do mesmo projeto, DEPOIS de schema_pro.sql,
-- schema_pro_016.sql e schema_pro_017.sql.
--
-- patient_relationships continua vazia em produção (Convites nunca
-- existiu até agora), então é seguro simplificar o enum de status
-- aqui: as duas fases que eu tinha inventado (invite_sent/
-- pending_acceptance) nunca tiveram nenhuma funcionalidade real que
-- as distinguisse — viram uma só, 'pending'. 'declined' é novo,
-- pedido explícito desta sprint.
-- ============================================================

-- nome digitado pelo profissional ao convidar (opcional, "Nome" do
-- modal "Convidar Paciente") — nunca existiu antes porque convite
-- por código digitado manualmente (desenho antigo) não pedia isso.
alter table patient_relationships add column if not exists nome_convidado text;

alter table patient_relationships alter column status set default 'pending';

alter table patient_relationships drop constraint if exists patient_relationships_status_check;
alter table patient_relationships add constraint patient_relationships_status_check
  check (status in ('pending', 'active', 'declined', 'ended'));

-- ============================================================
-- workspace_patient_summary ganha data_vinculo (accepted_at) e
-- perfil_completo no final da lista de colunas — "create or replace
-- view" só permite ACRESCENTAR colunas no fim, nunca remover/
-- reordenar as que já existem, então isso é seguro pra quem já
-- consulta essa view hoje (Sprint 017). data_vinculo é necessário
-- pra tela de Pacientes desta sprint (coluna "Data de vínculo").
--
-- profiles vira LEFT JOIN (era join/inner) — achado real do teste de
-- ponta a ponta desta sprint: um paciente que aceita o convite pela
-- página pública ganha uma linha em auth.users e em
-- patient_relationships (status='active') na hora, mas só ganha uma
-- linha em profiles quando abre o app do paciente de verdade e
-- termina o próprio cadastro (peso inicial, medicamento etc.) — isso
-- é uma etapa separada, feita pelo paciente, fora do controle desta
-- página. Com INNER JOIN esse paciente ficava com vínculo ativo no
-- banco mas invisível na tela Pacientes, contradizendo o texto da
-- própria tela de convite ("o vínculo acontece automaticamente").
-- perfil_completo (p.id is not null) deixa a tela distinguir e
-- mostrar "Aguardando primeiro acesso" em vez de simplesmente sumir
-- o paciente da lista. nome cai pra nome_convidado (digitado pelo
-- profissional ao convidar) quando ainda não há profiles.nome.
-- ============================================================
create or replace view workspace_patient_summary
with (security_invoker = true) as
select
  pr.id as relationship_id,
  pr.workspace_id,
  pr.patient_id,
  coalesce(p.nome, pr.nome_convidado) as nome,
  p.medicamento,
  p.dia_aplicacao,
  p.peso_inicial,
  p.data_inicio,
  lw.peso as peso_atual,
  lw.date as ultima_pesagem_data,
  w30.peso as peso_30d_atras,
  la.date as ultima_aplicacao_data,
  greatest(
    coalesce(lw.updated_at, 'epoch'::timestamptz),
    coalesce(la.updated_at, 'epoch'::timestamptz),
    coalesce(ld.updated_at, 'epoch'::timestamptz)
  ) as ultimo_registro,
  pr.accepted_at as data_vinculo,
  (p.id is not null) as perfil_completo
from patient_relationships pr
left join profiles p on p.id = pr.patient_id
left join lateral (
  select peso, date, updated_at from weighings
  where user_id = pr.patient_id and deleted_at is null
  order by date desc, updated_at desc limit 1
) lw on true
left join lateral (
  select peso from weighings
  where user_id = pr.patient_id and deleted_at is null
    and date <= (current_date - interval '30 days')
  order by date desc limit 1
) w30 on true
left join lateral (
  select date, updated_at from applications
  where user_id = pr.patient_id and deleted_at is null
  order by date desc, updated_at desc limit 1
) la on true
left join lateral (
  select updated_at from daily_logs
  where user_id = pr.patient_id and deleted_at is null
  order by updated_at desc limit 1
) ld on true
where pr.status = 'active';

-- ============================================================
-- get_invite_preview(p_code) — único jeito de alguém (autenticado ou
-- não) ver quem é o profissional por trás de um convite, ANTES de
-- criar conta ou entrar. SECURITY DEFINER porque nenhuma policy de
-- RLS libera leitura de patient_relationships pra quem não é o
-- paciente vinculado nem o dono do workspace — e aqui, no momento da
-- pré-visualização, nenhuma das duas coisas é verdade ainda. Só
-- devolve o mínimo necessário (nome/profissão/nome do workspace +
-- status), nunca a linha inteira.
-- ============================================================
create or replace function get_invite_preview(p_code text)
returns table (
  status text,
  profissional_nome text,
  profissao_nome text,
  workspace_nome text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select pr.status, pp.nome, prof.nome, w.nome
    from patient_relationships pr
    join workspaces w on w.id = pr.workspace_id
    join professional_profiles pp on pp.id = w.owner_id
    left join professions prof on prof.id = pp.profession_id
    where pr.code = p_code
    limit 1;
end;
$$;

revoke all on function get_invite_preview(text) from public;
grant execute on function get_invite_preview(text) to anon, authenticated;

-- ============================================================
-- redeem_workspace_invite(p_code) — recriada pro novo enum (pending
-- em vez de invite_sent/pending_acceptance). Mesmo mecanismo de
-- antes: SECURITY DEFINER, único ponto que preenche patient_id e
-- avança status pra 'active'.
-- ============================================================
drop function if exists redeem_workspace_invite(text);
create or replace function redeem_workspace_invite(p_code text)
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

  select * into v_rel from patient_relationships
    where code = p_code and status = 'pending'
    and (expires_at is null or expires_at > now())
    limit 1;

  if v_rel.id is null then
    raise exception 'Código de convite inválido ou expirado';
  end if;

  if exists (select 1 from patient_relationships where patient_id = auth.uid() and status = 'active') then
    raise exception 'Você já está vinculado a um profissional. Desvincule antes de aceitar um novo convite.';
  end if;

  update patient_relationships
    set patient_id = auth.uid(), status = 'active', accepted_at = now()
    where id = v_rel.id
    returning * into v_rel;

  return v_rel;
end;
$$;

revoke all on function redeem_workspace_invite(text) from public;
grant execute on function redeem_workspace_invite(text) to authenticated;

-- ============================================================
-- decline_workspace_invite(p_code) — mesmo princípio do redeem, só
-- que grava 'declined' em vez de 'active'. Também guarda patient_id
-- (quem recusou), pra auditoria — mesmo raciocínio já usado em
-- invited_by.
-- ============================================================
create or replace function decline_workspace_invite(p_code text)
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

  select * into v_rel from patient_relationships
    where code = p_code and status = 'pending'
    limit 1;

  if v_rel.id is null then
    raise exception 'Código de convite inválido ou expirado';
  end if;

  update patient_relationships
    set patient_id = auth.uid(), status = 'declined', ended_at = now(), ended_reason = 'Recusado pelo paciente'
    where id = v_rel.id
    returning * into v_rel;

  return v_rel;
end;
$$;

revoke all on function decline_workspace_invite(text) from public;
grant execute on function decline_workspace_invite(text) to authenticated;
