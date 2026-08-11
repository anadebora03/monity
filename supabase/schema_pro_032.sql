-- ============================================================
-- MONITY · Migração incremental (Sprint Integração Eduzz)
--
-- IDEMPOTENTE: mesmo padrão de sempre — alter com if not exists,
-- policy/constraint sempre drop if exists + create, insert com on
-- conflict. Depende de schema_pro_025.sql (subscriptions,
-- payment_providers, plans) e schema_pro_031.sql
-- (is_active_platform_admin) já terem rodado antes.
--
-- Prepara o banco pra receber o webhook da Eduzz — NENHUM código de
-- app escreve aqui ainda além do webhook em si, que é implementado
-- numa migração de código separada (rota /api/eduzz/webhook).
-- ============================================================

-- ============================================================
-- 1. payment_providers — ativa a linha 'eduzz' (só 'manual' estava
--    ativo desde schema_pro_025.sql).
-- ============================================================
insert into payment_providers (slug, nome, active) values ('eduzz', 'Eduzz', true)
on conflict (slug) do update set active = true, nome = excluded.nome;

-- ============================================================
-- 2. subscription_products — mapeamento external_product_id -> plano
--    Monity. DELIBERADAMENTE não duplica price_cents/patient_limit:
--    pra produto profissional, isso já existe em `plans` (criada na
--    Sprint Assinatura) — duplicar aqui criaria duas fontes de
--    verdade pro mesmo preço, que podem desincronizar. Pra produto de
--    paciente (que ainda não tem tabela de "planos" própria, item 16
--    do brief), guarda só o mínimo necessário (patient_product_slug +
--    billing_interval) direto nesta tabela.
--
--    Nenhuma linha é semeada aqui: os external_product_id reais só
--    existem depois que os produtos forem criados na Eduzz (decisão
--    de negócio ainda não tomada) — cadastro manual, mesmo espírito
--    de "plans"/"payment_providers".
-- ============================================================
create table if not exists subscription_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_product_id text not null,
  product_type text not null check (product_type in ('professional', 'patient')),
  plan_id uuid references plans(id),
  patient_product_slug text,
  billing_interval text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_product_id)
);

alter table subscription_products drop constraint if exists subscription_products_type_check;
alter table subscription_products add constraint subscription_products_type_check
  check (
    (product_type = 'professional' and plan_id is not null and patient_product_slug is null)
    or (product_type = 'patient' and plan_id is null and patient_product_slug is not null)
  );

drop trigger if exists trg_subscription_products_updated_at on subscription_products;
create trigger trg_subscription_products_updated_at before update on subscription_products for each row execute function set_updated_at();

-- RLS: config interna (mapeamento de IDs de fornecedor), sem UI hoje —
-- só platform_admins leem/escrevem, mesmo padrão de organizations
-- (schema_pro_025.sql). is_active_platform_admin() evita o mesmo erro
-- de recursão corrigido em schema_pro_031.sql.
alter table subscription_products enable row level security;
drop policy if exists "select_admin" on subscription_products;
create policy "select_admin" on subscription_products for select
  using (is_active_platform_admin(auth.uid()));
drop policy if exists "write_admin" on subscription_products;
create policy "write_admin" on subscription_products for all
  using (is_active_platform_admin(auth.uid()))
  with check (is_active_platform_admin(auth.uid()));

-- ============================================================
-- 3. eduzz_webhook_events — idempotência + auditoria. O mesmo evento
--    pode chegar mais de uma vez (retry da Eduzz); external_event_id
--    único é o que impede processar duas vezes. status='error' fica
--    disponível pra reprocessar na próxima entrega do mesmo evento
--    (nunca é tratado como duplicado — só 'processed'/'ignored' são).
-- ============================================================
create table if not exists eduzz_webhook_events (
  id uuid primary key default gen_random_uuid(),
  external_event_id text not null,
  event_name text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'error')),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_eduzz_webhook_events_external_id on eduzz_webhook_events (external_event_id);

drop trigger if exists trg_eduzz_webhook_events_updated_at on eduzz_webhook_events;
create trigger trg_eduzz_webhook_events_updated_at before update on eduzz_webhook_events for each row execute function set_updated_at();

-- RLS: só platform_admins leem (pode conter e-mail/nome do
-- comprador). Sem policy de insert/update pra authenticated de
-- propósito — só a service role escreve aqui, e service role
-- bypassa RLS por natureza (nunca é o profissional/paciente logado
-- fazendo essa escrita).
alter table eduzz_webhook_events enable row level security;
drop policy if exists "select_admin" on eduzz_webhook_events;
create policy "select_admin" on eduzz_webhook_events for select
  using (is_active_platform_admin(auth.uid()));

-- ============================================================
-- 4. subscriptions — generaliza pra suportar assinatura de PACIENTE,
--    não só de workspace/profissional. workspace_id e plan_id viram
--    opcionais (plan_id nunca foi lido por nenhuma tela ainda — só
--    existia no schema desde schema_pro_025.sql, seguro tornar
--    opcional); user_id é o dono quando é assinatura de paciente.
--    subscription_product_id aponta pro mapeamento de origem (item 3
--    acima) — funciona igual pros dois tipos, sem tabela paralela por
--    tipo de produto (pedido explícito do brief: "sem implementação
--    engessada por produto").
--
--    provider_subscription_id (contrato Eduzz) já existia desde
--    schema_pro_025.sql — reaproveitado, não duplicado.
-- ============================================================
alter table subscriptions alter column workspace_id drop not null;
alter table subscriptions alter column plan_id drop not null;
alter table subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table subscriptions add column if not exists product_type text not null default 'professional' check (product_type in ('professional', 'patient'));
alter table subscriptions add column if not exists subscription_product_id uuid references subscription_products(id);
alter table subscriptions add column if not exists external_customer_id text;

alter table subscriptions drop constraint if exists subscriptions_owner_check;
alter table subscriptions add constraint subscriptions_owner_check check (
  (workspace_id is not null and user_id is null) or (workspace_id is null and user_id is not null)
);

create index if not exists idx_subscriptions_user on subscriptions (user_id);

-- RLS aditiva: paciente lê a própria assinatura (mesmo mecanismo de
-- "select_own_workspace" pro profissional, schema_pro_030.sql).
-- Nenhuma policy de escrita pra authenticated — criação/atualização
-- de assinatura sempre passa pela service role (webhook) ou pela
-- função solicitar_cancelamento_assinatura() já existente.
drop policy if exists "select_own_user" on subscriptions;
create policy "select_own_user" on subscriptions for select
  using (auth.uid() = user_id);
