-- ============================================================
-- COMPASSO PRO · Migração incremental (Sprint 020 — Relatórios)
-- Rode no SQL Editor do mesmo projeto, DEPOIS de schema_pro.sql,
-- schema_pro_016.sql, schema_pro_017.sql e schema_pro_018.sql.
--
-- Só guarda o REGISTRO da emissão (data, paciente, período,
-- profissional) — nunca o PDF em si, que é sempre gerado sob
-- demanda pelo mesmo motor (js/report-engine.js) tanto no app do
-- paciente quanto aqui. `modulos` é um snapshot opcional de quais
-- seções o profissional incluiu, só pra exibir no histórico —
-- não é usado pra re-gerar nada.
-- ============================================================

create table if not exists report_emissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  periodo_ini date not null,
  periodo_fim date not null,
  modulos jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_emissions_workspace_idx on report_emissions (workspace_id, created_at desc);
create index if not exists report_emissions_patient_idx on report_emissions (patient_id);

alter table report_emissions enable row level security;

-- mesmo padrão dono-do-workspace-lê-tudo já usado em patient_relationships/
-- workspace_patient_summary: só o profissional dono do workspace vê e
-- registra emissões dele mesmo.
drop policy if exists "select_own_workspace" on report_emissions;
create policy "select_own_workspace" on report_emissions for select
  using (exists (select 1 from workspaces w where w.id = report_emissions.workspace_id and w.owner_id = auth.uid()));

drop policy if exists "insert_own_workspace" on report_emissions;
create policy "insert_own_workspace" on report_emissions for insert
  with check (
    professional_id = auth.uid()
    and exists (select 1 from workspaces w where w.id = report_emissions.workspace_id and w.owner_id = auth.uid())
  );
