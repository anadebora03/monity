-- ============================================================
-- MONITY · Migração incremental (Sprint Assinatura do Monity Pro)
--
-- IDEMPOTENTE: todo alter usa IF NOT EXISTS, todo insert/update de
-- dado usa ON CONFLICT DO UPDATE (nunca DO NOTHING aqui — os valores
-- de plano ainda podem mudar até o lançamento comercial, então rodar
-- este arquivo de novo deve sempre deixar `plans` igual ao que está
-- escrito abaixo, não só "criar se não existir"), toda policy/função
-- é DROP IF EXISTS + CREATE ou CREATE OR REPLACE.
--
-- Depende de schema_pro.sql (plans, workspaces, workspace_patient_usage,
-- redeem_workspace_invite) e schema_pro_025.sql (subscriptions,
-- payment_providers) já terem rodado antes.
-- ============================================================

-- ============================================================
-- 1. plans — primeira definição comercial real dos 4 planos. Até
--    aqui só existia 'start' com patient_limit/price_cents nulos
--    ("não vou inventar preço/limite pra tier que não existe de
--    verdade ainda", schema_pro.sql). Confirmado com a usuária que os
--    4 tiers abaixo (nome/preço/limite) já são a decisão comercial
--    real, então viram linha de banco, não hardcode em componente.
--
--    destaque: coluna nova, só pra marcar qual plano leva o selo
--    "Mais escolhido" na tela de comparação — é uma decisão de
--    negócio que muda com o tempo, não faz sentido fixar no frontend.
-- ============================================================
alter table plans add column if not exists destaque boolean not null default false;

insert into plans (slug, nome, patient_limit, price_cents, included_seats, periodo, features, status, destaque) values
  ('start', 'Monity Pro Start', 10, 14990, 10, 'mensal',
    '["Até 10 pacientes", "Monity Pro", "Acompanhamento dos pacientes", "Relatórios", "Agenda", "Convites", "Integração com Monity App"]'::jsonb,
    'active', false),
  ('essential', 'Monity Pro Essential', 25, 29990, 25, 'mensal',
    '["Até 25 pacientes", "Monity Pro", "Acompanhamento dos pacientes", "Relatórios", "Agenda", "Convites", "Integração com Monity App", "Recursos profissionais avançados"]'::jsonb,
    'active', true),
  ('clinic', 'Monity Pro Clinic', 50, 49990, 50, 'mensal',
    '["Até 50 pacientes", "Monity Pro", "Acompanhamento dos pacientes", "Relatórios", "Agenda", "Convites", "Integração com Monity App", "Recursos profissionais avançados"]'::jsonb,
    'active', false),
  ('unlimited', 'Monity Pro Unlimited', null, 79990, null, 'mensal',
    '["Pacientes ilimitados", "Monity Pro", "Acompanhamento dos pacientes", "Relatórios", "Agenda", "Convites", "Integração com Monity App", "Recursos profissionais avançados"]'::jsonb,
    'active', false)
on conflict (slug) do update set
  nome = excluded.nome,
  patient_limit = excluded.patient_limit,
  price_cents = excluded.price_cents,
  included_seats = excluded.included_seats,
  periodo = excluded.periodo,
  features = excluded.features,
  status = excluded.status,
  destaque = excluded.destaque;

-- ============================================================
-- 2. workspaces — solicitação de troca de plano. Sem gateway de
--    pagamento integrado, "Fazer upgrade" não pode trocar o plano na
--    hora (seria inventar uma cobrança que não aconteceu) — grava só
--    a intenção, pra ser processada manualmente (mesma filosofia já
--    documentada em schema_pro_025.sql: "com poucos profissionais dá
--    pra administrar direto pelo painel do Supabase por um tempo").
--    Colunas simples em workspaces (não uma tabela nova) porque é
--    só "qual é o pedido mais recente", sem necessidade de histórico
--    de várias solicitações.
-- ============================================================
alter table workspaces add column if not exists requested_plan_id uuid references plans(id);
alter table workspaces add column if not exists requested_plan_at timestamptz;

-- ============================================================
-- 3. redeem_workspace_invite() — recriada (mesma assinatura de
--    schema_pro_018.sql) só pra acrescentar a checagem de limite que
--    nunca existiu: hoje um workspace no limite do plano continua
--    aceitando vínculo novo sem nenhuma trava, em qualquer camada.
--    Checa contra workspace_patient_usage (a mesma view já usada só
--    pra exibir no dashboard) no momento exato em que o vínculo vira
--    'active' — é o único lugar que garante a regra mesmo se
--    alguém pular a checagem do frontend (pro/lib/invites.ts) chamando
--    a função direto. Vínculo já ativo nunca é afetado — a trava é
--    só pra impedir que ENTRE um vínculo novo além da capacidade.
-- ============================================================
create or replace function redeem_workspace_invite(p_code text)
returns patient_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel patient_relationships;
  v_limit integer;
  v_used integer;
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

  select patient_limit, patients_used into v_limit, v_used
    from workspace_patient_usage where workspace_id = v_rel.workspace_id;

  if v_limit is not null and v_used >= v_limit then
    raise exception 'Este profissional atingiu o limite de pacientes do plano atual.';
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
-- 4. subscriptions — RLS aditiva (mesmo mecanismo de "select_pro" em
--    schema_pro.sql / "select_admin" em schema_pro_025.sql): uma
--    SEGUNDA policy permissiva de SELECT, sem tocar em
--    "select_financeiro". Até aqui só master/financeiro liam
--    subscriptions ("dado financeiro", decisão deliberada da Sprint
--    025) — o profissional nunca conseguia ver a própria assinatura.
--    Esta policy libera só a leitura da própria linha (via
--    workspace_id -> owner_id), nunca escrita: cancelamento continua
--    passando pela função abaixo, nunca por UPDATE direto.
-- ============================================================
drop policy if exists "select_own_workspace" on subscriptions;
create policy "select_own_workspace" on subscriptions for select
  using (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- ============================================================
-- 5. solicitar_cancelamento_assinatura() — mesmo padrão de
--    set_patient_access_source (schema_pro_029.sql): função estreita
--    e específica em vez de afrouxar "write_financeiro" pro
--    profissional. Só marca a intenção de cancelamento na própria
--    subscription (se existir uma) — não existe gateway pra
--    efetivamente parar cobrança nenhuma, então isso vira uma fila
--    real pro time tratar manualmente, nunca uma promessa de
--    suspensão automática.
-- ============================================================
create or replace function solicitar_cancelamento_assinatura(p_reason text default null)
returns subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub subscriptions;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update subscriptions s
    set status = 'canceled', canceled_at = now(), cancel_reason = p_reason
    where s.workspace_id in (select id from workspaces where owner_id = auth.uid())
      and s.status in ('active', 'trialing', 'past_due')
    returning * into v_sub;

  if v_sub.id is null then
    raise exception 'Nenhuma assinatura ativa encontrada para cancelar.';
  end if;

  return v_sub;
end;
$$;

revoke all on function solicitar_cancelamento_assinatura(text) from public;
grant execute on function solicitar_cancelamento_assinatura(text) to authenticated;
