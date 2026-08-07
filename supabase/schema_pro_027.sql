-- ============================================================
-- MONITY PRO · Migração incremental (Sprint M0 — Rebranding
-- Compasso → Monity, ajuste de dados)
--
-- IDEMPOTENTE: todo UPDATE é condicional pelo valor antigo, pode
-- rodar em qualquer ambiente, quantas vezes for preciso, sem efeito
-- colateral numa segunda execução. Nenhuma estrutura (tabela/coluna/
-- relacionamento) é tocada — só os 3 valores literais que
-- representam o nome antigo da marca em linhas de dado já inseridas
-- por migrações anteriores (schema_pro.sql, schema_pro_025.sql).
-- ============================================================

update plans set nome = 'Monity Pro Start' where nome = 'Compasso Pro Start';

update system_settings set nome = 'Monity' where nome = 'Compasso';

update feature_flags set slug = 'monity_admin' where slug = 'compasso_admin';
