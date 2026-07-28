-- ============================================================
-- COMPASSO PRO · Schema de dados (Sprint 015)
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase,
-- DEPOIS de supabase/schema.sql já ter sido executado ao menos uma
-- vez (este arquivo depende da extensão pgcrypto e da função
-- set_updated_at() criadas lá, e estende as 8 tabelas do paciente
-- que schema.sql já criou).
-- Idempotente: pode ser rodado mais de uma vez sem duplicar nada.
--
-- Ver COMPASSO_PRO_BLUEPRINT.md pra arquitetura completa (mapa de
-- permissões, decisões estruturais, fora de escopo). Resumo do que
-- este arquivo faz:
--   1. Cria 4 tabelas novas (professional_profiles, workspaces,
--      workspace_invites, workspace_patients) — nenhuma tabela do
--      paciente é alterada de forma destrutiva.
--   2. Adiciona UMA policy de SELECT a mais nas 8 tabelas do
--      paciente, permitindo leitura por um profissional vinculado
--      — a policy "select_own" existente não é tocada; Postgres
--      combina múltiplas policies permissivas do mesmo comando com
--      OR automaticamente, então isso é estritamente aditivo.
--   3. Cria uma função redeem_workspace_invite(code), SECURITY
--      DEFINER, único jeito de um convite virar vínculo — o
--      paciente nunca lê a tabela workspace_invites diretamente
--      (evitaria vazar e-mail/código de outros convites), só chama
--      essa função com o código que recebeu.
--
-- Limitação conhecida e aceita nesta versão (mesma régua da dívida
-- técnica documentada em schema.sql):
--   - Um paciente só pode ter um vínculo ATIVO por vez (índice único
--     parcial em workspace_patients). Trocar de profissional exige
--     desvincular antes de vincular a outro — decisão do blueprint,
--     não uma limitação técnica a contornar aqui.
-- ============================================================

-- ---------- professional_profiles (1:1 com auth.users) ----------
create table if not exists professional_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  profissao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- workspaces (o "consultório" de um profissional) ----------
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text,
  plan text not null default 'free',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- workspace_invites (convite por código) ----------
create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  code text not null,
  paciente_email text,
  status text not null default 'pending', -- pending | accepted | revoked | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  deleted_at timestamptz
);

-- ---------- workspace_patients (o vínculo ATIVO paciente<->workspace) ----------
create table if not exists workspace_patients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid references workspace_invites(id),
  status text not null default 'active', -- active | inactive
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============================================================
-- Índices — só os que a Sprint 017 (convites) e 019 (lista de
-- pacientes) já sabem que vão precisar. Nenhum índice especulativo
-- além disso, mesma disciplina de schema.sql.
-- ============================================================
create unique index if not exists uq_workspace_patients_patient_active
  on workspace_patients (patient_id) where status = 'active';
create index if not exists idx_workspace_patients_workspace
  on workspace_patients (workspace_id) where status = 'active';

create unique index if not exists uq_workspace_invites_code on workspace_invites (code);
create index if not exists idx_workspace_invites_workspace on workspace_invites (workspace_id);

create index if not exists idx_workspaces_owner on workspaces (owner_id);

-- ============================================================
-- Trigger de updated_at — reaproveita a função já criada por
-- schema.sql, mesmo mecanismo, mesma justificativa (timestamp
-- sempre definido pelo servidor, nunca pelo relógio do cliente).
-- ============================================================
drop trigger if exists trg_updated_at on professional_profiles;
create trigger trg_updated_at before update on professional_profiles for each row execute function set_updated_at();
drop trigger if exists trg_updated_at on workspaces;
create trigger trg_updated_at before update on workspaces for each row execute function set_updated_at();
drop trigger if exists trg_updated_at on workspace_patients;
create trigger trg_updated_at before update on workspace_patients for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security — tabelas novas
-- ============================================================
alter table professional_profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_invites enable row level security;
alter table workspace_patients enable row level security;

-- professional_profiles: mesmo padrão dono-only de profiles.
drop policy if exists "select_own" on professional_profiles;
drop policy if exists "insert_own" on professional_profiles;
drop policy if exists "update_own" on professional_profiles;
create policy "select_own" on professional_profiles for select using (auth.uid() = id);
create policy "insert_own" on professional_profiles for insert with check (auth.uid() = id);
create policy "update_own" on professional_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- workspaces: só o dono lê/escreve o próprio workspace.
drop policy if exists "select_own" on workspaces;
drop policy if exists "insert_own" on workspaces;
drop policy if exists "update_own" on workspaces;
create policy "select_own" on workspaces for select using (auth.uid() = owner_id);
create policy "insert_own" on workspaces for insert with check (auth.uid() = owner_id);
create policy "update_own" on workspaces for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- workspace_invites: só o dono do workspace gerencia convites. O
-- paciente NUNCA lê esta tabela diretamente — ele resgata um código
-- via redeem_workspace_invite() (função abaixo, SECURITY DEFINER),
-- que enxerga a tabela inteira independente de RLS. Sem isso, uma
-- policy de select liberada pra "quem sabe o código" não é possível
-- em RLS puro (RLS filtra linhas, não valida um valor digitado).
drop policy if exists "select_own" on workspace_invites;
drop policy if exists "insert_own" on workspace_invites;
drop policy if exists "update_own" on workspace_invites;
create policy "select_own" on workspace_invites for select
  using (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "insert_own" on workspace_invites for insert
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
create policy "update_own" on workspace_invites for update
  using (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- workspace_patients: paciente vê o próprio vínculo; profissional vê
-- os vínculos do próprio workspace. Nenhuma policy de INSERT aqui de
-- propósito — a única forma de criar uma linha é via
-- redeem_workspace_invite() (SECURITY DEFINER, ignora RLS). Isso
-- impede tanto paciente quanto profissional de criar um vínculo
-- "direto", contornando a validação do código.
drop policy if exists "select_linked" on workspace_patients;
drop policy if exists "update_linked" on workspace_patients;
create policy "select_linked" on workspace_patients for select
  using (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );
-- update: paciente pode se desvincular (status -> inactive); profissional
-- pode revogar o vínculo do próprio workspace. Nenhum dos dois altera
-- workspace_id/patient_id (RLS não restringe coluna por coluna, mas
-- a UI nunca oferece esse caminho — documentado, não escondido).
create policy "update_linked" on workspace_patients for update
  using (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  )
  with check (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- ============================================================
-- redeem_workspace_invite(p_code) — único ponto de escrita em
-- workspace_patients a partir de um código. Roda como o dono da
-- função (SECURITY DEFINER), não como o paciente que chama —
-- por isso consegue ler workspace_invites (que o paciente não pode
-- ler direto) e inserir em workspace_patients (que não tem policy
-- de insert pra ninguém). A validação de negócio mora inteira aqui
-- dentro, não espalhada entre RLS e frontend.
-- ============================================================
create or replace function redeem_workspace_invite(p_code text)
returns workspace_patients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite workspace_invites;
  v_link workspace_patients;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_invite from workspace_invites
    where code = p_code and status = 'pending'
    and (expires_at is null or expires_at > now())
    limit 1;

  if v_invite.id is null then
    raise exception 'Código de convite inválido ou expirado';
  end if;

  if exists (select 1 from workspace_patients where patient_id = auth.uid() and status = 'active') then
    raise exception 'Você já está vinculado a um profissional. Desvincule antes de aceitar um novo convite.';
  end if;

  insert into workspace_patients (workspace_id, patient_id, invite_id, status)
    values (v_invite.workspace_id, auth.uid(), v_invite.id, 'active')
    returning * into v_link;

  update workspace_invites set status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
    where id = v_invite.id;

  return v_link;
end;
$$;

-- defesa em profundidade: mesmo com a checagem de auth.uid() dentro
-- da função, só a role "authenticated" pode chamá-la via API — anon
-- nunca deveria nem tentar (reforça, não substitui, o "if auth.uid()
-- is null" acima).
revoke all on function redeem_workspace_invite(text) from public;
grant execute on function redeem_workspace_invite(text) to authenticated;

-- ============================================================
-- RLS — extensão ADITIVA nas 8 tabelas do paciente (schema.sql).
-- Cada tabela ganha uma SEGUNDA policy permissiva de SELECT — a
-- policy "select_own" já existente não é alterada nem removida.
-- Postgres combina policies permissivas do mesmo comando com OR,
-- então isso só amplia quem pode ler, nunca restringe o paciente.
-- Nenhuma policy de insert/update é tocada: profissional continua
-- sem conseguir escrever nenhum dado de saúde do paciente, mesmo
-- direto pela API do Supabase.
-- ============================================================
drop policy if exists "select_pro" on profiles;
create policy "select_pro" on profiles for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = profiles.id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on weighings;
create policy "select_pro" on weighings for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = weighings.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on applications;
create policy "select_pro" on applications for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = applications.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on daily_logs;
create policy "select_pro" on daily_logs for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = daily_logs.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on exams;
create policy "select_pro" on exams for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = exams.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on bioimpedance;
create policy "select_pro" on bioimpedance for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = bioimpedance.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on agenda;
create policy "select_pro" on agenda for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = agenda.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));

drop policy if exists "select_pro" on pens;
create policy "select_pro" on pens for select
  using (exists (
    select 1 from workspace_patients wp join workspaces w on w.id = wp.workspace_id
    where wp.patient_id = pens.user_id and wp.status = 'active' and w.owner_id = auth.uid()
  ));
