-- ============================================================
-- MONITY · Migração incremental (Sprint 025 — Monity Admin,
-- Fase 1: SOMENTE arquitetura)
--
-- IDEMPOTENTE: todo create/alter usa IF NOT EXISTS, toda policy/
-- trigger é DROP IF EXISTS + CREATE, todo INSERT usa ON CONFLICT DO
-- NOTHING. Rodar este arquivo mais de uma vez, em qualquer ambiente,
-- nunca duplica dado nem quebra — não é preciso manter uma lista
-- separada de "quais SQLs já rodei". A única dependência real é a
-- função set_updated_at(), criada em schema.sql (já existe em
-- qualquer ambiente onde o resto do projeto já roda) — nenhuma outra
-- dependência de ordem entre migrações.
--
-- Decisão explícita desta sprint (confirmada pela usuária): NÃO
-- construir nenhuma tela/rota /admin agora — o Monity Pro e o app
-- do paciente ainda nem lançaram, e com poucos profissionais/pacientes
-- dá pra administrar direto pelo painel do Supabase por um tempo.
-- O que esta migração entrega é só a base: tabelas, papéis,
-- permissões e RLS — pronta pra quando o volume justificar construir
-- o Backoffice de verdade (v2), sem precisar redesenhar nada.
--
-- Por isso esta migração É TODA aditiva e não toca em nenhum código
-- de aplicação (nem pro/, nem app.js) — zero risco pro que já está
-- em produção. Onde a generalização pedida esbarrava numa coluna já
-- usada por código real (ver nota em "plans" abaixo), optei por
-- ADICIONAR a versão nova ao lado da antiga, nunca por renomear —
-- renomear exigiria editar pro/lib/dashboard.ts e pro/lib/types.ts,
-- o que já seria "tocar em tela", fora do combinado desta sprint.
-- ============================================================

-- ============================================================
-- 1. platform_admins — identidade do administrador, TOTALMENTE
--    separada de professional_profiles. A existência da linha (não
--    um campo/claim solto) é que define "isso é um admin" — mesmo
--    princípio já usado pra professional_profiles/profiles: uma
--    conta do Supabase Auth pode não ter nenhuma das três linhas, só
--    uma, ou (tecnicamente) mais de uma, sem que uma dê acesso à
--    outra. RLS de profissional/paciente NUNCA checa esta tabela, e
--    vice-versa — são dois sistemas de permissão paralelos, nunca
--    um derivado do outro.
-- ============================================================
create table if not exists platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null default 'suporte' check (role in ('master', 'admin', 'suporte', 'financeiro')),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_platform_admins_updated_at on platform_admins;
create trigger trg_platform_admins_updated_at before update on platform_admins for each row execute function set_updated_at();

-- ============================================================
-- 2. organizations — preparação pra clínica/equipe com múltiplos
--    workspaces ou profissionais compartilhando recursos. NINGUÉM
--    lê ou escreve nesta tabela ainda (nenhum código de app foi
--    tocado) — só existe pra evitar que "clínica com vários
--    profissionais", quando vier, exija redesenhar workspaces do
--    zero. workspaces.organization_id é opcional de propósito: hoje
--    todo workspace continua independente (1 profissional = 1
--    workspace, comportamento atual, inalterado).
-- ============================================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists trg_organizations_updated_at on organizations;
create trigger trg_organizations_updated_at before update on organizations for each row execute function set_updated_at();

alter table workspaces add column if not exists organization_id uuid references organizations(id);

-- ============================================================
-- 3. plans — generalização de patient_limit pra included_seats.
--    IMPORTANTE: patient_limit NÃO foi removido nem renomeado —
--    pro/lib/dashboard.ts e pro/lib/types.ts leem essa coluna hoje,
--    em produção, e mexer nela seria alterar código de tela, fora do
--    escopo combinado desta sprint. included_seats é uma coluna NOVA,
--    ao lado, pra representar o conceito mais amplo pedido ("paciente
--    hoje, secretária/estagiário/outro profissional amanhã") sem
--    quebrar nada que já funciona. Quando o Admin de verdade for
--    construído, esse é o ponto natural pra migrar os dois nomes
--    pra um só.
-- ============================================================
alter table plans add column if not exists included_seats integer;
alter table plans add column if not exists periodo text not null default 'mensal' check (periodo in ('mensal', 'semestral', 'anual'));
alter table plans add column if not exists features jsonb not null default '[]'::jsonb;
alter table plans add column if not exists status text not null default 'active' check (status in ('active', 'archived', 'draft'));

alter table workspaces add column if not exists included_seats integer;

-- ============================================================
-- 4. payment_providers — catálogo de provedores de pagamento. Existe
--    pra que "quem processou esse pagamento" nunca fique espalhado
--    como string solta em vários lugares — é uma referência só, como
--    professions/plans já são. Só 'manual' fica ativo nesta sprint
--    (é o único que existe de verdade); eduzz/asaas/stripe/apple/
--    google ficam documentados aqui como os slugs esperados quando
--    cada integração for construída, sem inventar uma linha "ativa"
--    pra integração que não existe.
-- ============================================================
create table if not exists payment_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- manual | eduzz | asaas | stripe | apple | google
  nome text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into payment_providers (slug, nome) values
  ('manual', 'Manual')
on conflict (slug) do nothing;

-- ============================================================
-- 5. subscriptions — Workspace -> Subscription -> Plan -> Provider.
--    Entidade própria (não um campo em workspaces) pelo mesmo motivo
--    de sempre neste projeto: histórico (upgrade/downgrade/renovação
--    viram linhas novas, nunca sobrescrevem a anterior), auditoria, e
--    permite múltiplas tentativas/ciclos sem perder o que já
--    aconteceu. Nenhum código de app cria linha aqui ainda — a tabela
--    nasce vazia, pronta pra quando o Admin ou uma integração real
--    de pagamento existir.
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  plan_id uuid not null references plans(id),
  provider_id uuid references payment_providers(id),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  valor_cents integer,
  provider_subscription_id text, -- id externo (Eduzz/Asaas/Stripe...), null até integrar de verdade
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  ultimo_pagamento_em timestamptz,
  canceled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at before update on subscriptions for each row execute function set_updated_at();

create index if not exists idx_subscriptions_workspace on subscriptions (workspace_id);
create index if not exists idx_subscriptions_status on subscriptions (status);

-- ============================================================
-- 6. admin_audit_log — genérico de propósito (entity_type/entity_id/
--    action/old_data/new_data), não uma lista fixa de eventos
--    nomeados. Serve pra qualquer ação administrativa futura sem
--    precisar de migração nova toda vez que um tipo de ação novo
--    aparecer. Nenhum código escreve aqui ainda — a tabela existe,
--    a política de INSERT já está pronta pra quando o Admin nascer.
-- ============================================================
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references auth.users(id),
  performed_at timestamptz not null default now(),
  ip text,
  user_agent text
);

create index if not exists idx_admin_audit_log_entity on admin_audit_log (entity_type, entity_id);
create index if not exists idx_admin_audit_log_performed_by on admin_audit_log (performed_by);
create index if not exists idx_admin_audit_log_performed_at on admin_audit_log (performed_at desc);

-- ============================================================
-- 7. system_settings — renomeado de "platform_settings" (proposta
--    original) pra deixar explícito que não é só "configuração da
--    página de admin", é parâmetro global do sistema inteiro:
--    manutenção, feature toggles avulsos, LGPD, banners, integrações.
--    Trava numa única linha (id boolean primary key default true) —
--    não existe "várias configurações do sistema", só uma.
-- ============================================================
create table if not exists system_settings (
  id boolean primary key default true check (id),
  nome text,
  logo_url text,
  email_contato text,
  telefone_contato text,
  politica_url text,
  termos_url text,
  links jsonb not null default '[]'::jsonb,
  banners jsonb not null default '[]'::jsonb,
  mensagem_global text,
  manutencao_ativa boolean not null default false,
  manutencao_mensagem text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_system_settings_updated_at on system_settings;
create trigger trg_system_settings_updated_at before update on system_settings for each row execute function set_updated_at();

insert into system_settings (id, nome) values (true, 'Compasso') on conflict (id) do nothing;

-- ============================================================
-- 8. feature_flags — liberar funcionalidade gradualmente sem virar
--    uma nova versão do app. Semeado com o que já existe de verdade
--    (enabled=true, documentando o que já foi lançado) e com os itens
--    do roadmap já levantado na auditoria arquitetural anterior
--    (AUDITORIA_ARQUITETURAL_PRO.md), marcados enabled=false/internal
--    — documentação, não promessa de prazo. NENHUM código do app lê
--    esta tabela ainda — checagem de flag é trabalho de uma sprint
--    futura, quando houver uma funcionalidade de verdade pra gatear.
-- ============================================================
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  enabled boolean not null default false,
  beta boolean not null default false,
  internal boolean not null default false,
  release_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_feature_flags_updated_at on feature_flags;
create trigger trg_feature_flags_updated_at before update on feature_flags for each row execute function set_updated_at();

insert into feature_flags (slug, nome, enabled, beta, internal) values
  ('agenda', 'Agenda Inteligente', true, false, false),
  ('plano_terapeutico', 'Plano Terapêutico Compartilhado', true, false, false),
  ('assistente_clinico', 'Assistente Clínico Inteligente', true, false, false),
  ('compasso_admin', 'Backoffice Administrativo', false, false, true),
  ('crm', 'CRM Comercial', false, false, true),
  ('white_label', 'White Label', false, false, true),
  ('marketplace', 'Marketplace de Profissionais', false, false, true)
on conflict (slug) do nothing;

-- ============================================================
-- 9. RLS — Row Level Security em toda tabela nova, sem exceção
--    (mesma disciplina de schema.sql/schema_pro.sql: nenhuma tabela
--    fica sem RLS "porque ainda não tem UI").
--
--    Regra central desta sprint: nenhuma policy abaixo depende de
--    professional_profiles — só de platform_admins. É essa separação
--    que garante que ter conta de profissional nunca dá acesso aqui,
--    e vice-versa.
-- ============================================================
alter table platform_admins enable row level security;
alter table organizations enable row level security;
alter table payment_providers enable row level security;
alter table subscriptions enable row level security;
alter table admin_audit_log enable row level security;
alter table system_settings enable row level security;
alter table feature_flags enable row level security;

-- platform_admins: todo admin ativo vê a lista inteira (time pequeno,
-- transparência interna é o padrão certo aqui); só master gerencia
-- (cria/edita/desativa) outros admins. Ninguém apaga uma linha —
-- desativação é sempre active=false, nunca delete, mesmo princípio
-- de deleted_at usado no resto do projeto.
drop policy if exists "select_self" on platform_admins;
drop policy if exists "select_admin_team" on platform_admins;
create policy "select_admin_team" on platform_admins for select
  using (auth.uid() = id or exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

drop policy if exists "insert_master" on platform_admins;
create policy "insert_master" on platform_admins for insert
  with check (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role = 'master'));

drop policy if exists "update_master" on platform_admins;
create policy "update_master" on platform_admins for update
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role = 'master'));

-- organizations: só admins enxergam por enquanto (nenhum profissional
-- lê isso ainda — a coluna workspaces.organization_id não é exposta
-- em nenhuma tela).
drop policy if exists "select_admin" on organizations;
create policy "select_admin" on organizations for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));
drop policy if exists "write_admin" on organizations;
create policy "write_admin" on organizations for all
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active))
  with check (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

-- payment_providers: catálogo de referência, mesmo padrão de
-- professions/plans — qualquer autenticado pode ler.
drop policy if exists "select_authenticated" on payment_providers;
create policy "select_authenticated" on payment_providers for select using (auth.role() = 'authenticated');

-- subscriptions: dado financeiro — só master e financeiro leem/
-- escrevem. Admin/suporte não têm acesso a valor/forma de pagamento.
drop policy if exists "select_financeiro" on subscriptions;
create policy "select_financeiro" on subscriptions for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role in ('master', 'financeiro')));
drop policy if exists "write_financeiro" on subscriptions;
create policy "write_financeiro" on subscriptions for all
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role in ('master', 'financeiro')))
  with check (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role in ('master', 'financeiro')));

-- admin_audit_log: qualquer admin ativo lê (auditoria só funciona se
-- for visível pro time todo) e só registra a própria ação — nunca
-- grava em nome de outro admin.
drop policy if exists "select_admin" on admin_audit_log;
create policy "select_admin" on admin_audit_log for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));
drop policy if exists "insert_own" on admin_audit_log;
create policy "insert_own" on admin_audit_log for insert
  with check (performed_by = auth.uid() and exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

-- system_settings: qualquer admin ativo lê; só master escreve
-- (config de plataforma tem alcance grande demais pra deixar aberto
-- pra suporte/financeiro editarem).
drop policy if exists "select_admin" on system_settings;
create policy "select_admin" on system_settings for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));
drop policy if exists "update_master" on system_settings;
create policy "update_master" on system_settings for update
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role = 'master'));

-- feature_flags: leitura aberta a qualquer autenticado de propósito
-- (quando alguma tela do Pro ou do app do paciente precisar checar
-- uma flag no futuro, não deveria precisar de nenhuma policy nova
-- pra isso) — só master/admin escrevem.
drop policy if exists "select_authenticated" on feature_flags;
create policy "select_authenticated" on feature_flags for select using (auth.role() = 'authenticated');
drop policy if exists "write_admin" on feature_flags;
create policy "write_admin" on feature_flags for all
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role in ('master', 'admin')))
  with check (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active and pa.role in ('master', 'admin')));

-- ============================================================
-- 10. RLS aditiva nas tabelas já existentes — mesmo padrão já usado
--     pra "select_pro" (Sprint 015): uma SEGUNDA policy permissiva de
--     SELECT, nunca substitui as que já existem. Dá ao admin
--     visibilidade cross-workspace SEM tocar em nenhuma policy do
--     paciente/profissional já em produção.
-- ============================================================
drop policy if exists "select_admin" on professional_profiles;
create policy "select_admin" on professional_profiles for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

drop policy if exists "select_admin" on workspaces;
create policy "select_admin" on workspaces for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

drop policy if exists "select_admin" on patient_relationships;
create policy "select_admin" on patient_relationships for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

drop policy if exists "select_admin" on profiles;
create policy "select_admin" on profiles for select
  using (exists (select 1 from platform_admins pa where pa.id = auth.uid() and pa.active));

-- ============================================================
-- 11. Bootstrap do primeiro Administrador Master — DELIBERADAMENTE
--     NÃO incluído aqui. O schema só prepara a estrutura (tabela +
--     RLS + policies); decidir quem é o primeiro master é uma ação
--     de implantação, não de schema — não deveria acontecer sozinha
--     só porque alguém rodou esta migração num ambiente novo. Quando
--     existir o Backoffice (ou um script de bootstrap dedicado),
--     o primeiro master é inserido explicitamente ali, por decisão
--     humana, não como efeito colateral deste arquivo.
-- ============================================================
