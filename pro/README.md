# Monity Pro

Painel web para profissionais de saúde (nutricionistas, médicos) acompanharem pacientes do
Monity. Projeto separado do app do paciente (raiz do repositório) — mesmo backend Supabase,
frontend próprio. Ver `../MONITY_PRO_BLUEPRINT.md` para a arquitetura completa.

## Rodar localmente

```bash
npm install
cp .env.local.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

`NEXT_PUBLIC_SUPABASE_URL` já vem preenchido no `.env.local.example` — é o mesmo projeto
Supabase do app do paciente (`js/config.js` na raiz do repo). A anon key é pública (fica exposta
no HTML de qualquer app cliente), pode copiar a mesma de lá.

## Deploy

Projeto Vercel próprio (não o mesmo do app do paciente), root directory `pro/`. Variáveis de
ambiente na Vercel: as mesmas duas do `.env.local`.

## Banco de dados

Este app não faz nenhuma migração — todo o schema (`professions`, `plans`,
`professional_profiles`, `workspaces`, `patient_relationships`) já existe no Supabase, criado
por `../supabase/schema_pro.sql` e `../supabase/schema_pro_016.sql`.
