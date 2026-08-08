-- ============================================================
-- MONITY · Correção do upsert de daily_logs
--
-- Bug encontrado: pushDailyLogs() (js/database.js) faz
-- upsert(row, {onConflict:'user_id,date'}) na tabela daily_logs.
-- O Postgres só aceita ON CONFLICT (user_id, date) se existir um
-- índice único NÃO PARCIAL exatamente nessas colunas — o índice que
-- existia (uq_daily_logs_user_date) era parcial (`where deleted_at
-- is null`), então todo upsert falhava silenciosamente (o erro só
-- ia pro console, nunca travava o app nem avisava a usuária).
-- Resultado real observado: nenhum registro de água/proteína/
-- sintomas do Diário jamais chegou no banco, em nenhuma conta.
--
-- weighings/bioimpedance também têm índice parcial em (user_id,
-- date), mas não são afetadas por este bug — o upsert delas usa o
-- `id` do registro como alvo do ON CONFLICT, não (user_id, date).
-- Só daily_logs usa a data como chave de upsert (não tem id próprio
-- por registro, é 1 linha por dia).
--
-- Rode este arquivo no SQL Editor do Supabase, depois de
-- schema.sql já ter sido aplicado. Idempotente.
-- ============================================================

drop index if exists uq_daily_logs_user_date;
create unique index if not exists uq_daily_logs_user_date on daily_logs (user_id, date);
