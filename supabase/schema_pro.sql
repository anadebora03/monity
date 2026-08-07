-- ============================================================
-- MONITY PRO · Schema de dados (Sprint 015 — Fundação da Plataforma)
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase, no
-- MESMO projeto do app do paciente (depois de supabase/schema.sql).
-- Autossuficiente: não depende de nada além de schema.sql já ter
-- rodado (para as 8 tabelas do paciente que a seção final estende).
-- Idempotente: pode ser rodado mais de uma vez sem duplicar nada.
--
-- Ver MONITY_PRO_BLUEPRINT.md pra arquitetura completa.
--
-- >>> Esta versão SUBSTITUI qualquer rodada anterior neste projeto <<<
-- Duas rodadas anteriores já aconteceram neste projeto: a primeira
-- criou workspace_invites + workspace_patients como tabelas
-- separadas; esta consolida as duas num único patient_relationships
-- (uma entidade de relacionamento própria, com histórico e 4
-- estados). Como "create table if not exists" não altera uma tabela
-- que já existe, workspaces/professional_profiles também precisam
-- ser derrubadas e recriadas aqui pra pegar as colunas novas
-- (plan_id/profession_id) — nenhuma delas tem linha real ainda
-- (nenhum app usa elas ainda). As 8 tabelas do PACIENTE (profiles,
-- weighings, etc.) nunca são tocadas por nenhum DROP deste arquivo.
-- ============================================================

-- ---------- limpeza da versão anterior desta sprint (tabelas vazias, seguro) ----------
-- "create table if not exists" NÃO altera uma tabela que já existe —
-- se workspaces/professional_profiles já foram criadas numa tentativa
-- anterior (com plan/profissao em vez de plan_id/profession_id), elas
-- ficam com a estrutura VELHA silenciosamente. Por isso este bloco
-- derruba tudo que pertence só a esta sprint (nenhuma tabela do
-- paciente) antes de recriar — nenhuma delas tem dado real ainda.
drop policy if exists "select_pro" on profiles;
drop policy if exists "select_pro" on weighings;
drop policy if exists "select_pro" on applications;
drop policy if exists "select_pro" on daily_logs;
drop policy if exists "select_pro" on exams;
drop policy if exists "select_pro" on bioimpedance;
drop policy if exists "select_pro" on agenda;
drop policy if exists "select_pro" on pens;

drop function if exists redeem_workspace_invite(text);
drop view if exists workspace_patient_usage;
drop table if exists patient_relationships cascade;
drop table if exists workspace_patients cascade;
drop table if exists workspace_invites cascade;
drop table if exists workspaces cascade;
drop table if exists professional_profiles cascade;

-- ---------- professions (tabela de referência — nunca string solta no código) ----------
-- Adicionar uma profissão nova no futuro (ex.: Educador Físico) é uma
-- linha aqui, zero mudança de código ou de RLS.
create table if not exists professions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into professions (slug, nome) values
  ('nutricionista', 'Nutricionista'),
  ('medico', 'Médico(a)')
on conflict (slug) do nothing;

-- ---------- plans (tabela de referência — mesma lógica de professions) ----------
-- patient_limit null = ilimitado. Preço/cobrança fora de escopo desta
-- sprint (LICENSE_CONFIG.ENABLED=false é o precedente já usado no
-- paciente pra "estrutura pronta, enforcement desligado"). Semeio só
-- o plano padrão que todo Workspace novo recebe — os nomes futuros
-- (Essential/Clinic/Enterprise) e seus limites reais são decisão de
-- negócio que ainda não foi definida (não vou inventar preço/limite
-- pra tier que não existe de verdade ainda).
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  patient_limit integer,
  price_cents integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into plans (slug, nome, patient_limit, price_cents) values
  ('start', 'Compasso Pro Start', null, null)
on conflict (slug) do nothing;

-- ---------- professional_profiles (1:1 com auth.users) ----------
create table if not exists professional_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  profession_id uuid references professions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- workspaces (o "consultório" de um profissional) ----------
-- patient_limit aqui é um OVERRIDE opcional por workspace (ex.: um
-- upgrade pontual sem trocar de plano); quando nulo, vale o limite
-- do plano — a view workspace_patient_usage abaixo já resolve essa
-- prioridade, ninguém mais no código precisa saber dessa regra.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text,
  plan_id uuid references plans(id),
  patient_limit integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- patient_relationships (Workspace → Relacionamento → Paciente) ----------
-- Entidade PRÓPRIA, não um campo solto — é o que permite, sem
-- refatoração futura: histórico de vínculos (nunca apagado, só muda
-- de status), troca de profissional, auditoria (quem convidou,
-- quando cada transição aconteceu), e multi-profissional (cada
-- vínculo é uma linha independente).
--
-- patient_id é nulo até o convite ser aceito — antes disso, code é a
-- única forma de identificar o convite. status nunca é apagado, só
-- caminha invite_sent -> pending_acceptance -> active -> ended (ou
-- é encerrado direto de invite_sent, se revogado antes do aceite).
create table if not exists patient_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  code text,
  patient_email text,
  status text not null default 'invite_sent', -- invite_sent | pending_acceptance | active | ended
  ended_reason text,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Índices
-- ============================================================
create unique index if not exists uq_patient_relationships_code
  on patient_relationships (code) where code is not null;
-- um paciente só tem UM relacionamento ativo por vez (mesma decisão
-- do blueprint — trocar de profissional é encerrar e criar de novo).
create unique index if not exists uq_patient_relationships_patient_active
  on patient_relationships (patient_id) where status = 'active';
create index if not exists idx_patient_relationships_workspace
  on patient_relationships (workspace_id);
create index if not exists idx_workspaces_owner on workspaces (owner_id);

-- ============================================================
-- Trigger de updated_at — autossuficiente (create or replace),
-- mesmo mecanismo de schema.sql.
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_updated_at on professional_profiles;
create trigger trg_updated_at before update on professional_profiles for each row execute function set_updated_at();
drop trigger if exists trg_updated_at on workspaces;
create trigger trg_updated_at before update on workspaces for each row execute function set_updated_at();
drop trigger if exists trg_updated_at on patient_relationships;
create trigger trg_updated_at before update on patient_relationships for each row execute function set_updated_at();

-- ============================================================
-- workspace_patient_usage — limite/uso/disponível por workspace,
-- calculado ao vivo (nunca um contador que pode desalinhar do real).
-- security_invoker=true declarado explicitamente (não confiar no
-- default da versão do Postgres): a view respeita o RLS de quem
-- está consultando, nunca vaza dado de outro workspace.
-- ============================================================
create or replace view workspace_patient_usage
with (security_invoker = true) as
select
  w.id as workspace_id,
  w.owner_id,
  coalesce(w.patient_limit, p.patient_limit) as patient_limit,
  count(pr.id) filter (where pr.status = 'active') as patients_used,
  case when coalesce(w.patient_limit, p.patient_limit) is null then null
    else greatest(coalesce(w.patient_limit, p.patient_limit) - count(pr.id) filter (where pr.status = 'active'), 0)
  end as patients_available
from workspaces w
left join plans p on p.id = w.plan_id
left join patient_relationships pr on pr.workspace_id = w.id
group by w.id, w.owner_id, w.patient_limit, p.patient_limit;

-- ============================================================
-- Row Level Security — tabelas novas
-- ============================================================
alter table professions enable row level security;
alter table plans enable row level security;
alter table professional_profiles enable row level security;
alter table workspaces enable row level security;
alter table patient_relationships enable row level security;

-- professions/plans: catálogo de referência, sem dado sensível —
-- qualquer usuário autenticado pode ler (precisa pra montar um
-- dropdown de profissão/plano no onboarding do Pro). Sem policy de
-- insert/update/delete: só eu gerencio essas linhas direto no painel.
drop policy if exists "select_authenticated" on professions;
create policy "select_authenticated" on professions for select using (auth.role() = 'authenticated');
drop policy if exists "select_authenticated" on plans;
create policy "select_authenticated" on plans for select using (auth.role() = 'authenticated');

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

-- patient_relationships: paciente vê os PRÓPRIOS relacionamentos
-- (inclusive 'ended' — é o histórico dele); profissional vê os do
-- PRÓPRIO workspace. Sem policy de INSERT pra ninguém além do dono
-- do workspace (criar convite) — a transição pending->active só
-- acontece via redeem_workspace_invite() (SECURITY DEFINER),
-- nunca por um UPDATE direto de paciente ou profissional.
drop policy if exists "select_linked" on patient_relationships;
drop policy if exists "insert_own_workspace" on patient_relationships;
drop policy if exists "update_linked" on patient_relationships;
create policy "select_linked" on patient_relationships for select
  using (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );
create policy "insert_own_workspace" on patient_relationships for insert
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
-- update: profissional pode encerrar/editar um relacionamento do
-- próprio workspace; paciente só encerra o próprio (desvincular-se).
-- Nenhum dos dois consegue reescrever patient_id pra outra pessoa
-- via RLS — a única gravação de patient_id é dentro da função abaixo.
create policy "update_linked" on patient_relationships for update
  using (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  )
  with check (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- ============================================================
-- redeem_workspace_invite(p_code) — único ponto de escrita que
-- preenche patient_id e avança o status pra 'active'. SECURITY
-- DEFINER: roda com privilégio pra ler um patient_relationships que
-- ainda não é do paciente (patient_id nulo) e gravar nele — nenhuma
-- policy de RLS pro paciente permite isso diretamente, de propósito.
-- ============================================================
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
    where code = p_code and status in ('invite_sent', 'pending_acceptance')
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
-- RLS — extensão ADITIVA nas 8 tabelas do paciente (schema.sql).
-- Cada tabela ganha uma SEGUNDA policy permissiva de SELECT — a
-- policy "select_own" já existente não é alterada nem removida.
-- Postgres combina policies permissivas do mesmo comando com OR,
-- então isso só amplia quem pode ler, nunca restringe o paciente.
-- Nenhuma policy de insert/update é tocada: profissional continua
-- sem conseguir escrever nenhum dado de saúde do paciente.
-- ============================================================
create policy "select_pro" on profiles for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = profiles.id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on weighings for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = weighings.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on applications for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = applications.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on daily_logs for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = daily_logs.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on exams for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = exams.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on bioimpedance for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = bioimpedance.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on agenda for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = agenda.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));

create policy "select_pro" on pens for select
  using (exists (
    select 1 from patient_relationships pr join workspaces w on w.id = pr.workspace_id
    where pr.patient_id = pens.user_id and pr.status = 'active' and w.owner_id = auth.uid()
  ));
