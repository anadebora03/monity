# Dívida Técnica — Monity Pro

Cada item aqui corresponde a um achado com evidência real, detalhado em
[AUDITORIA_ARQUITETURAL_PRO.md](AUDITORIA_ARQUITETURAL_PRO.md). Nada
nesta lista foi implementado — é registro pra priorização futura.

## Curto prazo

### 1. Índice ausente em `applications(user_id, date)`
**Descrição**: a tabela `applications` só tem índice em `(user_id, updated_at)` (`supabase/schema.sql:177`); o `workspace_patient_summary` (`supabase/schema_pro_017.sql:50-54`) ordena por `date desc` sem suporte direto de índice.
**Impacto**: baixo hoje, cresce com o volume de aplicações por paciente.
**Prioridade**: baixa.
**Estimativa de esforço**: trivial — uma migração de uma linha (`create index ... on applications(user_id, date desc)`).

### 2. Query sequencial em `listarPacientes()`
**Descrição**: `pro/lib/patients.ts:23-36` faz duas queries com `await` sequencial em vez de `Promise.all`.
**Impacto**: baixo — um round-trip extra, não é N+1 por paciente.
**Prioridade**: baixa.
**Estimativa de esforço**: trivial — reescrever como `Promise.all`.

### 3. Ausência de observabilidade em produção
**Descrição**: nenhuma ferramenta de monitoramento de erro (Sentry, Vercel Analytics de erro, ou equivalente) está configurada — confirmado por grep sem resultado em `pro/`.
**Impacto**: médio — erros em produção só são descobertos por relato manual, como já aconteceu nesta própria sessão (schema `planos_terapeuticos` não aplicado, só percebido ao testar manualmente).
**Prioridade**: média.
**Estimativa de esforço**: baixa — configurar um serviço já é majoritariamente infraestrutura, não código novo.

## Médio prazo

### 4. Zero testes automatizados no `pro/`
**Descrição**: nenhum arquivo `.test`/`.spec` no código próprio do Pro (confirmado via glob). Toda verificação de regressão é manual: build + inspeção visual no navegador.
**Impacto**: médio — depende inteiramente de disciplina humana pra não introduzir regressão, especialmente em `lib/*-data.ts` (regras de negócio concentradas ali).
**Prioridade**: média.
**Estimativa de esforço**: alta pra cobertura ampla; viável incrementalmente começando pelos módulos de regra de negócio mais densos (`dashboard.ts`, `patient-detail.ts`, `plano-terapeutico-data.ts`).

### 5. Query extra por navegação no middleware
**Descrição**: `pro/lib/supabase/middleware.ts:66-70` consulta `professional_profiles` em toda navegação autenticada não-pública, mesmo sem mudança de estado.
**Impacto**: baixo em latência absoluta, mas paga em 100% das navegações.
**Prioridade**: média (só sobe se latência de navegação virar uma reclamação real).
**Estimativa de esforço**: média — moveria esse dado pra um JWT custom claim/`app_metadata`, o que é uma mudança no fluxo de autenticação, não um ajuste isolado.

### 6. Paginação ausente em Dashboard e `/pro/pacientes`
**Descrição**: `pro/lib/dashboard.ts:84-91` e `pro/lib/patients.ts:24-27` buscam todos os pacientes ativos do workspace sem `.limit()`; o Dashboard só corta pra 8 no cliente, depois de já ter buscado tudo.
**Impacto**: baixo hoje (maior workspace real tem 1 paciente), mas é o achado nº1 de "maior risco arquitetural" da auditoria — primeiro ponto que sentiria crescimento de base.
**Prioridade**: média (monitorar, não é urgente com o volume atual).
**Estimativa de esforço**: média — exige paginação real na query (cursor ou offset) e ajuste de UI.

## Longo prazo

### 7. Upload de fotos de evolução nunca chega ao profissional
**Descrição**: `weighings.foto` (base64) só existe no dispositivo do paciente — sem coluna no schema (`supabase/schema.sql`), sem campo no payload de sincronização (`js/database.js`), sem nenhum código de Storage em `pro/`.
**Impacto**: alto em percepção de valor — é uma funcionalidade real e usada pelo paciente que o Perfil 360º do profissional simplesmente não reflete.
**Prioridade**: alta (maior impacto de produto entre todos os itens desta lista), mas esforço alto o suficiente pra não caber numa correção pontual.
**Estimativa de esforço**: alta — exige Supabase Storage, bucket com RLS própria, mudança de schema (`weighings.foto_url` ou tabela própria), mudança no motor de sincronização do app do paciente e leitura nova no Pro.

### 8. Acoplamento de build entre `pro/` e a raiz do monorepo
**Descrição**: `pro/scripts/sync-shared.js:18-19` lê `../../js/*.js` — o build do Pro não é autocontido, depende do checkout inteiro do repositório.
**Impacto**: baixo hoje (decisão consciente, documentada desde a Sprint 020), alto SE algum dia `pro/` for extraído pra um repositório separado sem ajuste.
**Prioridade**: baixa (não há sinal de que a separação de repositórios está nos planos).
**Estimativa de esforço**: baixa NA HORA que for decidido fazer a separação — não vale investir nisso antes de precisar.
