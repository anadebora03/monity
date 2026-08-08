-- ============================================================
-- MONITY · Migração incremental (Sprint 3 — Perfis, Configurações
-- e Gestão de Acessos)
--
-- IDEMPOTENTE: toda alteração é "if not exists"/"drop if exists" +
-- create, pode rodar em qualquer ambiente, quantas vezes for
-- preciso. Depende só de schema.sql, schema_pro.sql e
-- schema_pro_018.sql já terem rodado antes.
--
-- Três frentes, decididas na auditoria da Sprint 3:
--   1. access_source em patient_relationships — nasce SEMPRE nulo
--      (não determinado). Hoje não existe billing de paciente, então
--      não há como saber se o acesso é fornecido pelo profissional
--      ou é assinatura própria do paciente — fingir que sabemos
--      ('professional' por padrão) seria pior do que admitir que
--      ainda não sabemos. É o profissional, manualmente, quem marca
--      quando um paciente informa ter assinatura própria (Fase 2,
--      UI). Enquanto for null, a regra de negócio do app trata como
--      "não determinado" e restringe ações destrutivas.
--   2. avatar_url em profiles — o paciente hoje só tem fotos de
--      evolução de peso (locais, por pesagem); isso aqui é um campo
--      novo e separado, para foto de PERFIL.
--   3. bucket avatars no Storage — usado pelos dois avatares (foto de
--      perfil do paciente em profiles.avatar_url e do profissional em
--      professional_profiles.foto_url, coluna que já existe desde
--      schema_pro_016.sql). Path convention: {user_id}/avatar.{ext} —
--      cada usuário só escreve no próprio path (auth.uid() = pasta),
--      leitura pública (é uma foto de perfil, não um dado clínico).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Origem do acesso do paciente
-- ------------------------------------------------------------
alter table patient_relationships add column if not exists access_source text;

alter table patient_relationships drop constraint if exists patient_relationships_access_source_check;
alter table patient_relationships add constraint patient_relationships_access_source_check
  check (access_source is null or access_source in ('professional', 'independent'));

comment on column patient_relationships.access_source is
  'Origem do acesso do paciente ao Monity: professional = fornecido pelo profissional; independent = assinatura própria do paciente; null = não determinado (estado inicial de todo vínculo hoje, não há billing de paciente pra inferir isso automaticamente). Só access_source=''independent'' impede o profissional de bloquear/excluir — ele sempre pode encerrar o VÍNCULO (status=ended), independente disso.';

-- ------------------------------------------------------------
-- 2. Avatar do paciente
-- ------------------------------------------------------------
alter table profiles add column if not exists avatar_url text;

-- ------------------------------------------------------------
-- 3. Storage: bucket de avatares (paciente + profissional)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
