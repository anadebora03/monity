-- ============================================================
-- MONITY · Histórico prévio de tratamento (Sprint — Onboarding
-- com histórico prévio + correção dos cálculos de jornada)
-- Rode este arquivo no SQL Editor do painel do Supabase, depois
-- de schema.sql já ter sido aplicado.
-- Idempotente: pode ser rodado mais de uma vez sem duplicar nada.
--
-- profiles.data_inicio (já existente) continua sendo o início real do
-- tratamento usado em todos os cálculos de jornada/duração — em ambos
-- os fluxos de onboarding. historical_start_date é gravada em paralelo,
-- só como o valor originalmente informado pela pessoa no fluxo "já
-- comecei antes", preservado mesmo se data_inicio for editada depois
-- (Configurações → Histórico do Tratamento) — nenhum cálculo de app.js
-- lê historical_start_date diretamente, é só um registro de proveniência.
-- Nenhum registro individual de aplicação passada é fabricado — só uma
-- contagem agregada (historical_applications_count).
-- ============================================================

alter table profiles add column if not exists historical_treatment boolean not null default false;
alter table profiles add column if not exists historical_start_date date;
alter table profiles add column if not exists historical_applications_count integer;
