-- ============================================================
-- MONITY PRO · Migração incremental (Sprint 017 — Dashboard)
-- Rode no SQL Editor do mesmo projeto, DEPOIS de schema_pro.sql e
-- schema_pro_016.sql. Só ADITIVO (uma view nova) — nada é derrubado.
--
-- workspace_patient_summary: UMA consulta agregada por paciente
-- vinculado (peso atual, marco zero, última pesagem/aplicação/
-- registro em qualquer uma das 3 tabelas mais usadas), em vez do
-- dashboard fazer N consultas (uma por paciente) toda vez que abre.
-- security_invoker=true: a view roda com a sessão de quem consulta,
-- então herda automaticamente todo o RLS já existente — nenhuma
-- condição de "só meu workspace" precisa ser repetida aqui, porque
-- patient_relationships/profiles/weighings/applications/daily_logs
-- já filtram isso sozinhos (ver schema_pro.sql).
-- ============================================================

create or replace view workspace_patient_summary
with (security_invoker = true) as
select
  pr.id as relationship_id,
  pr.workspace_id,
  pr.patient_id,
  p.nome,
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
  ) as ultimo_registro
from patient_relationships pr
join profiles p on p.id = pr.patient_id
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
