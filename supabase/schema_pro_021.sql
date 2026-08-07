-- ============================================================
-- MONITY PRO · Migração incremental (Sprint 021 — Agenda Inteligente)
-- Rode no SQL Editor do mesmo projeto, DEPOIS de schema_pro_020.sql.
--
-- `compromissos` é uma entidade NOVA e independente de `patient_
-- relationships` — é a agenda do PROFISSIONAL (nunca visível pro
-- paciente, nunca sincronizada com o app dele). `patient_id` é
-- opcional de propósito (recomendação arquitetural da própria
-- Sprint 021): permite agendar coisas sem paciente vinculado
-- (reunião, bloqueio de agenda, treinamento) sem mudar a estrutura
-- no futuro. Não confundir com a tabela `agenda` já existente —
-- aquela é a agenda PESSOAL de cada paciente (consultas/exames que
-- ELE anota no próprio app), lida hoje via select_pro; esta aqui é
-- inteiramente do profissional.
-- ============================================================

create table if not exists compromissos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid references auth.users(id) on delete set null,
  titulo text,
  data date not null,
  hora time,
  duracao_min integer not null default 30,
  tipo text not null default 'Outro',
  observacoes text,
  cor text not null default '#2E6FC9',
  status text not null default 'agendado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compromissos_status_check check (status in ('agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado'))
);

create index if not exists compromissos_workspace_data_idx on compromissos (workspace_id, data);
create index if not exists compromissos_patient_idx on compromissos (patient_id);

drop trigger if exists trg_compromissos_updated_at on compromissos;
create trigger trg_compromissos_updated_at
  before update on compromissos
  for each row execute function set_updated_at();

alter table compromissos enable row level security;

-- mesmo padrão dono-do-workspace já usado em patient_relationships/
-- report_emissions: só o profissional dono do workspace lê/escreve
-- os próprios compromissos. Nenhuma policy libera acesso pro
-- paciente — a agenda do profissional é dele, não compartilhada.
drop policy if exists "select_own_workspace" on compromissos;
create policy "select_own_workspace" on compromissos for select
  using (exists (select 1 from workspaces w where w.id = compromissos.workspace_id and w.owner_id = auth.uid()));

drop policy if exists "insert_own_workspace" on compromissos;
create policy "insert_own_workspace" on compromissos for insert
  with check (exists (select 1 from workspaces w where w.id = compromissos.workspace_id and w.owner_id = auth.uid()));

drop policy if exists "update_own_workspace" on compromissos;
create policy "update_own_workspace" on compromissos for update
  using (exists (select 1 from workspaces w where w.id = compromissos.workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = compromissos.workspace_id and w.owner_id = auth.uid()));

drop policy if exists "delete_own_workspace" on compromissos;
create policy "delete_own_workspace" on compromissos for delete
  using (exists (select 1 from workspaces w where w.id = compromissos.workspace_id and w.owner_id = auth.uid()));
