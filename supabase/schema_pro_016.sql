-- ============================================================
-- MONITY PRO · Migração incremental (Sprint 016)
-- Rode no SQL Editor do mesmo projeto, DEPOIS de schema_pro.sql.
-- Diferente de schema_pro.sql, este arquivo NÃO derruba nada — a
-- partir desta sprint, professional_profiles/workspaces podem ter
-- linhas reais (profissionais de verdade se cadastrando), então toda
-- mudança aqui é ALTER TABLE aditivo, nunca DROP.
--
-- O que faz: prepara professional_profiles pra guardar os campos que
-- a Sprint 016 pede pra já "caber" na estrutura, mesmo sem nenhuma
-- tela ainda coletando isso (foto, CRN/CRM, especialidade, telefone,
-- cidade, estado, biografia) — só as colunas, sem UI nem validação
-- nesta sprint.
-- ============================================================

alter table professional_profiles add column if not exists foto_url text;
alter table professional_profiles add column if not exists crn_crm text;
alter table professional_profiles add column if not exists especialidade text;
alter table professional_profiles add column if not exists telefone text;
alter table professional_profiles add column if not exists cidade text;
alter table professional_profiles add column if not exists estado text;
alter table professional_profiles add column if not exists biografia text;
