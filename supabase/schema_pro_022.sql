-- ============================================================
-- COMPASSO PRO · Migração incremental (Sprint 022 — Plano Terapêutico)
-- Rode no SQL Editor do mesmo projeto, DEPOIS de schema_pro_021.sql.
--
-- `planos_terapeuticos` é uma entidade NOVA, independente do motor
-- de Insights/Plano Automático (esse continua 100% calculado ao
-- vivo, nunca gravado — ver js/actionplan.js e patient-detail.ts).
-- Aqui só vivem as orientações que o PROFISSIONAL escreve, à mão,
-- pra um paciente específico. "Pertence simultaneamente a workspace
-- -> profissional -> paciente" (pedido explícito da sprint): as três
-- colunas ficam sempre preenchidas, nunca uma sem a outra.
--
-- Notificações (push) ficam fora desta sprint por decisão explícita
-- do brief — e por isso NÃO existe uma tabela de eventos separada:
-- tudo que um notificador futuro precisaria ("plano novo", "plano
-- concluído", "prazo vencido") já é 100% derivável dos campos
-- created_at/concluido_em/prazo/status desta própria tabela, no
-- mesmo princípio "recalcula, nunca armazena" já usado em insights,
-- plano automático e nos alertas da Agenda (Sprint 021). Uma tabela
-- de eventos só faria sentido se algo fosse de fato DISPARAR essas
-- notificações agora — não é o caso.
-- ============================================================

create table if not exists planos_terapeuticos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text,
  categoria text not null default 'Outro',
  prazo date,
  prioridade text not null default 'media',
  permitir_conclusao_paciente boolean not null default true,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concluido_em timestamptz,
  constraint planos_terapeuticos_status_check check (status in ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  constraint planos_terapeuticos_prioridade_check check (prioridade in ('alta', 'media', 'baixa'))
);

create index if not exists planos_terapeuticos_patient_idx on planos_terapeuticos (patient_id, created_at desc);
create index if not exists planos_terapeuticos_workspace_idx on planos_terapeuticos (workspace_id);

drop trigger if exists trg_planos_terapeuticos_updated_at on planos_terapeuticos;
create trigger trg_planos_terapeuticos_updated_at
  before update on planos_terapeuticos
  for each row execute function set_updated_at();

alter table planos_terapeuticos enable row level security;

-- profissional (dono do workspace): CRUD completo nos planos que ele
-- mesmo criou pros seus pacientes.
drop policy if exists "select_own_workspace" on planos_terapeuticos;
create policy "select_own_workspace" on planos_terapeuticos for select
  using (exists (select 1 from workspaces w where w.id = planos_terapeuticos.workspace_id and w.owner_id = auth.uid()));

drop policy if exists "insert_own_workspace" on planos_terapeuticos;
create policy "insert_own_workspace" on planos_terapeuticos for insert
  with check (
    professional_id = auth.uid()
    and exists (select 1 from workspaces w where w.id = planos_terapeuticos.workspace_id and w.owner_id = auth.uid())
  );

drop policy if exists "update_own_workspace" on planos_terapeuticos;
create policy "update_own_workspace" on planos_terapeuticos for update
  using (exists (select 1 from workspaces w where w.id = planos_terapeuticos.workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = planos_terapeuticos.workspace_id and w.owner_id = auth.uid()));

-- paciente: só ENXERGA os próprios planos — nunca cria, nunca edita
-- direto (a única gravação de status pelo paciente é a função
-- concluir_plano_terapeutico() abaixo, SECURITY DEFINER, que checa
-- permitir_conclusao_paciente antes de qualquer coisa). Sem policy
-- de insert/update pro paciente aqui de propósito.
drop policy if exists "select_own" on planos_terapeuticos;
create policy "select_own" on planos_terapeuticos for select
  using (patient_id = auth.uid());

-- ============================================================
-- concluir_plano_terapeutico(p_plano_id) — único jeito do PACIENTE
-- marcar uma orientação como concluída. Mesmo padrão SECURITY
-- DEFINER já usado em redeem_workspace_invite()/decline_workspace_
-- invite(): a policy de RLS não libera update pro paciente, então
-- essa função é a única porta — e ela só mexe em status/concluido_
-- em, nunca em título/descrição/categoria/prazo (o paciente não
-- pode reescrever a orientação do profissional).
-- ============================================================
create or replace function concluir_plano_terapeutico(p_plano_id uuid)
returns planos_terapeuticos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano planos_terapeuticos;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_plano from planos_terapeuticos
    where id = p_plano_id and patient_id = auth.uid()
    limit 1;

  if v_plano.id is null then
    raise exception 'Plano não encontrado.';
  end if;

  if not v_plano.permitir_conclusao_paciente then
    raise exception 'Este item não pode ser concluído por você — fale com seu profissional.';
  end if;

  if v_plano.status = 'concluido' then
    return v_plano;
  end if;

  update planos_terapeuticos
    set status = 'concluido', concluido_em = now()
    where id = p_plano_id
    returning * into v_plano;

  return v_plano;
end;
$$;

revoke all on function concluir_plano_terapeutico(uuid) from public;
grant execute on function concluir_plano_terapeutico(uuid) to authenticated;
