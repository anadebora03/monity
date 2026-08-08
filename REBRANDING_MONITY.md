# Rebranding — Compasso → Monity (Sprint M0)

Relatório final da migração de marca. Nenhuma funcionalidade, regra de negócio, estrutura de
banco ou fluxo foi alterado nesta sprint — só nomenclatura pública e comentários internos.

## Escopo

Plataforma renomeada para **Monity**, composta por dois produtos: **Monity App** (paciente,
PWA na raiz do repositório) e **Monity Pro** (painel profissional, `pro/`). A landing page
(`landing/`) também foi atualizada.

## Arquivos alterados

### PWA do paciente (raiz)
- `index.html` — meta description, `<title>`, `apple-mobile-web-app-title`.
- `manifest.json` — `name`, `short_name`, `description`.
- `sw.js` — comentário de cabeçalho, `CACHE_NAME` (`monity-cache-*`), comentário do handler de
  notificação, e `CACHE_VERSION` incrementado (`build-20260807a-monity`) para forçar
  invalidação de cache em quem já tem o app instalado.
- `app.js` — 20 ocorrências de texto visível corrigidas: título da Home, textos de cuidado/
  disclaimer, telas de onboarding, Premium, exclusão de conta, permissão de notificação,
  rodapé de versão (`Monity v1.0.0`), comentários de SVG e do motor de relatório compartilhado.
- `js/actionplan.js`, `js/auth.js`, `js/config.js`, `js/database.js`, `js/insights.js`,
  `js/license.js`, `js/notifications.js`, `js/plano-terapeutico.js`, `js/supabase.js`,
  `js/timeline.js` — comentários de cabeçalho.
- `js/report-engine.js` — comentários, título e rodapé do PDF gerado.

### Monity Pro (`pro/`)
- `app/layout.tsx`, `app/page.tsx`, `app/cadastro/page.tsx`, `app/kit/page.tsx`,
  `app/onboarding/OnboardingWizard.tsx`, `app/convite/[code]/InviteFlow.tsx` — textos visíveis
  (títulos, botões, mensagens) e o badge de inicial da marca (`C` → `M`) no onboarding.
- `components/Sidebar.tsx`, `components/ProShell.tsx`, `components/AuthShell.tsx`,
  `components/DashboardView.tsx`, `components/InviteModal.tsx`,
  `components/patient-detail/tabs/PlanoTerapeuticoTab.tsx` — textos visíveis.
- `lib/auth.ts`, `lib/supabase/client.ts`, `tailwind.config.ts`, `.env.local.example`,
  `README.md` — comentários e referências ao blueprint renomeado.
- `package.json` / `package-lock.json` — `name` para `monity-pro` (lockfile regenerado com
  `npm install`).

### Landing (`landing/`)
- `app/layout.tsx` — keyword de metadata.
- `app/globals.css` — comentário de paleta.
- `components/layout/navbar.tsx`, `components/layout/footer.tsx` — alt text e nome da marca
  (o arquivo de imagem `/brand/logo-mark.png` em si não foi tocado — é ativo de design
  pendente).
- `components/sections/hero.tsx`, `components/sections/final-cta.tsx`,
  `components/sections/testimonials.tsx`, `components/legal-placeholder.tsx` — textos visíveis.
- `lib/config.ts`, `lib/content.ts` — nome do site, descrição, FAQ.
- `.env.example` — comentários (a URL `https://compasso.app` foi preservada, ver seção
  "Itens preservados").

### Banco de dados (`supabase/`)
- `schema.sql`, `schema_pro.sql`, `schema_pro_016.sql`, `schema_pro_017.sql`,
  `schema_pro_018.sql`, `schema_pro_020.sql`, `schema_pro_021.sql`, `schema_pro_022.sql`,
  `schema_pro_025.sql`, `schema_pro_026.sql` — comentários de cabeçalho corrigidos. Nenhuma
  tabela, coluna, relacionamento, policy ou migração antiga foi alterada estruturalmente.
- **`schema_pro_027.sql` (novo)** — migração idempotente que atualiza os 3 únicos valores de
  dado já inseridos por migrações anteriores que continham o nome antigo:
  `plans.nome = 'Compasso Pro Start'` → `'Monity Pro Start'`,
  `system_settings.nome = 'Compasso'` → `'Monity'`,
  `feature_flags.slug = 'compasso_admin'` → `'monity_admin'`.
  Os arquivos de migração antigos (`schema_pro.sql`, `schema_pro_025.sql`) foram deixados
  intactos nos seus `INSERT`s originais, seguindo a convenção do projeto de nunca editar
  migrações já existentes — a correção do dado em produção acontece só rodando o novo arquivo.
  **Ainda não confirmado como executado no Supabase pelo usuário.**

### Documentação
- `COMPASSO_PRO_BLUEPRINT.md` renomeado para **`MONITY_PRO_BLUEPRINT.md`**, conteúdo
  totalmente atualizado; as 3 referências cruzadas (`pro/README.md`, `pro/app/kit/page.tsx`,
  `supabase/schema_pro.sql`) já apontam para o novo nome.
  `AUDITORIA_ARQUITETURAL_PRO.md`, `AUDITORIA_UX_UI.md`, `DIVIDA_TECNICA.md`,
  `RELATORIO_QA_FINAL_MVP.md`, `RELEASE_CHECKLIST.md`, `QA_REPORT.md`, `LAUNCH_READINESS.md` —
  referências de marca atualizadas, conteúdo técnico (achados, notas, datas) preservado.

## Itens com o nome antigo encontrados

Todos os itens acima — nenhum ficou de fora do inventário original de 53 arquivos/169
ocorrências levantado no início desta sprint.

## Itens preservados propositalmente (não alterados)

- **11 chaves de `localStorage`** (`compasso_state_v1`, `compasso_theme_v1`,
  `compasso_actionplan_status_v1`, `compasso_sync_meta_v1`, `compasso_migrated_v1`,
  `compasso_insights_historico_v1`, `compasso_license_v1`, `compasso_notif_prefs_v1`,
  `compasso_notif_state_v1`, `compasso-landing-theme`, `compasso_pro_theme`) — são
  identificadores técnicos internos, não texto de marca visível. Renomear quebraria dados já
  salvos localmente pelos usuários existentes.
- **Atualização (2026-08-07, pós-lançamento)**: o projeto Vercel do Monity App foi renomeado de
  `compasso` para `monityapp`, com novo alias público `https://monityapp.vercel.app`. A URL
  hardcoded em `pro/app/convite/[code]/InviteFlow.tsx` foi atualizada para o novo endereço — não
  é mais uma exceção preservada, o link de convite agora aponta para o domínio Monity de verdade.
  `https://compasso.app` em `landing/lib/config.ts`/`landing/.env.example` continua preservado —
  é um domínio próprio ainda não registrado (não uma URL Vercel gerada automaticamente), decisão
  separada de quando/se registrar `monity.app` ou equivalente.
- **Arquivos de imagem da logo/ícones/favicons** — os textos ao redor (alt, títulos) foram
  atualizados para Monity, mas os arquivos de imagem em si (`/brand/logo-mark.png`, ícones do
  manifest, favicons) não foram substituídos — é um ativo de design ainda não entregue.
- **Literal de dado `'Compasso Pro Start'` e slug `'compasso_admin'`** nos arquivos de migração
  histórica (`schema_pro.sql`, `schema_pro_025.sql`) — o texto do arquivo fica como está (nunca
  se edita migração antiga neste projeto), a correção do dado em produção é feita pela nova
  migração `schema_pro_027.sql`.

## Verificação

- `pro/`: `tsc --noEmit` limpo; `npm run build` completou com sucesso (15 rotas, sem erros de
  tipo ou lint).
- `landing/`: `tsc --noEmit` limpo; `npm run build` completou com sucesso (8 rotas estáticas).
- `pro/package-lock.json` regenerado via `npm install`, `name` confirmado como `monity-pro`.
- Varredura global (`grep -i "compasso"` em todo o repositório, excluindo `node_modules`,
  `.next`, `.git` e worktrees de agentes antigos) confirma: **zero ocorrências públicas** de
  "Compasso"/"COMPASSO" — os únicos resultados restantes são as chaves de `localStorage`
  (minúsculas, técnicas) e os dois literais SQL históricos já documentados acima, ambos
  intencionais.

## Ajustes futuros (fora desta sprint)

- Rodar `schema_pro_027.sql` no Supabase de produção (ainda não confirmado).
- Rodar `schema_pro_026.sql` (correção de RLS da Sprint 034, entregue anteriormente) — também
  ainda não confirmado como executado.
- Substituir os arquivos de imagem de logo/ícone/favicon pela identidade visual definitiva da
  Monity quando o ativo de design for entregue.
- Registrar um domínio `monity.*` e migrar as 2 URLs de produção preservadas, quando o domínio
  estiver pronto — troca é mecânica (2 constantes), sem risco arquitetural.
