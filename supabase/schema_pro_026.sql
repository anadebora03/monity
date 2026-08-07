-- ============================================================
-- MONITY PRO · Migração incremental (Sprint 034 — Correção de
-- segurança: RLS de patient_relationships)
--
-- IDEMPOTENTE: policy é sempre DROP IF EXISTS + CREATE, pode rodar
-- em qualquer ambiente, quantas vezes for preciso, sem duplicar nem
-- quebrar nada. Depende só de patient_relationships já existir
-- (schema_pro.sql) — nenhuma outra dependência de ordem.
--
-- ACHADO (auditoria de lançamento, Sprint 034): as policies de
-- INSERT e UPDATE de patient_relationships (schema_pro.sql:241-255)
-- só verificavam se o workspace_id pertence ao profissional — nunca
-- verificavam patient_id nem status. O comentário original já
-- AFIRMAVA que "nenhum dos dois consegue reescrever patient_id pra
-- outra pessoa via RLS", mas a policy de verdade não impedia isso:
-- um profissional autenticado, batendo direto na API do Supabase
-- (não precisa nem passar pela tela), conseguia inserir uma linha já
-- com patient_id de QUALQUER paciente e status='active' — ganhando
-- leitura completa dos dados clínicos dele sem convite, sem aceite,
-- sem o paciente saber. Um paciente também conseguia, pelo mesmo
-- buraco, trocar o próprio workspace_id e se autovincular a um
-- profissional sem nunca ter resgatado o convite dele.
--
-- CORREÇÃO: as duas funções SECURITY DEFINER (redeem_workspace_
-- invite/decline_workspace_invite, schema_pro_018.sql) continuam
-- sendo o ÚNICO lugar que preenche patient_id e avança status pra
-- 'active'/'declined' — elas rodam como dono da função, que é dono
-- da tabela, e por isso não passam pelas policies de RLS abaixo
-- (mesmo mecanismo que já sustentava get_invite_preview() lendo
-- convite antes do paciente ter qualquer vínculo). As policies
-- comuns (as que valem pra qualquer client autenticado batendo na
-- API) agora aplicam de verdade o que o comentário antigo só
-- prometia:
--   INSERT: só cria convite (patient_id nulo, status='pending').
--   UPDATE: só encerra vínculo (status='ended') — nunca aceita,
--     nunca recusa, nunca troca patient_id/workspace_id. Verificado
--     que nenhum código do app (pro/lib/invites.ts) faz UPDATE
--     direto em patient_relationships hoje — só INSERT (convidar) e
--     SELECT (listar); a mudança não quebra nenhuma tela existente.
-- ============================================================

drop policy if exists "insert_own_workspace" on patient_relationships;
create policy "insert_own_workspace" on patient_relationships for insert
  with check (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    and patient_id is null
    and status = 'pending'
  );

drop policy if exists "update_linked" on patient_relationships;
create policy "update_linked" on patient_relationships for update
  using (
    auth.uid() = patient_id
    or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  )
  with check (
    status = 'ended'
    and (
      auth.uid() = patient_id
      or exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    )
  );
