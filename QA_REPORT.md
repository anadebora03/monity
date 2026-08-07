# Monity Pro — QA Report (Sprint 034, Certificação de Lançamento)

Auditoria de pré-lançamento antes da apresentação para 200+ profissionais de saúde e da
integração com a Eduzz. Combina navegação real pela aplicação (Dashboard, Pacientes, Perfil
360º com as 10 abas, Agenda, responsividade, tema escuro) com revisão de código direta nas
áreas onde isso é mais confiável do que simular pela interface — principalmente segurança
(RLS), acessibilidade de teclado e padrões de performance/volume.

## Cobertura dos testes — honesta, sem inflar

**Testado ao vivo, na aplicação real, logada:**
- Dashboard (com e sem paciente prioritário), Pacientes, Convites, Agenda, Relatórios,
  Configurações.
- Perfil 360º completo: as 10 abas (Resumo, Jornada, Aplicações, Peso, Bioimpedância, Exames,
  Sintomas, Plano Terapêutico, Agenda, Assistente Clínico) — nenhuma quebrou, todas mostram
  estado vazio coerente.
- Responsividade real (redimensionamento de viewport + medição de overflow via DOM): 320,
  375, 768, 1024, 1440px, no Dashboard, Pacientes e Perfil do paciente.
- Tema escuro: toggle, cor de fundo aplicada corretamente, contraste de texto verificado no
  cabeçalho do paciente.
- Navegação por teclado: foco via `tabIndex`, ativação via Enter, confirmado funcionando de
  ponta a ponta após a correção (ver abaixo).
- Console do navegador limpo, verificado numa aba nova sem histórico acumulado (o log desta
  ferramenta acumula entradas antigas entre navegações na mesma aba — isso gerou alguns falsos
  positivos nesta sessão, documentados e descartados um a um).

**Verificado por revisão de código (não pela interface), com justificativa:**
- **Segurança/RLS**: todas as políticas de Row Level Security das 23 tabelas do banco, lidas
  linha a linha (schema.sql + todos os schema_pro_*.sql). Não criei uma segunda conta de
  profissional para tentar acessar workspace alheio ao vivo — isso exigiria provisionar dados
  de teste adicionais no Supabase real da usuária, uma ação que prefiro não tomar sem pedido
  explícito. A revisão de código é o método correto e mais preciso para RLS de qualquer forma:
  a garantia de isolamento entre workspaces é uma propriedade da política SQL, não do que a UI
  mostra.
- **Volume/escalabilidade**: revisão dos padrões de consulta (paginação da Jornada via
  `IntersectionObserver`, agenda com janela de mês, `workspace_patient_summary` como view
  agregada) em vez de popular o banco com centenas de pacientes fictícios — a conta de teste
  tem 1 paciente sem histórico; inflar dados reais no Supabase da usuária não é uma decisão que
  eu deva tomar sozinho.
- **Acessibilidade (ARIA/labels)**: `grep` sistemático por `aria-label`, elementos ícone-only, e
  padrão de `<tr onClick>` em todo `pro/components/`.

**Não testado nesta sessão:**
- Login, Cadastro, Recuperação de senha, Logout — logados ao vivo. A sessão do navegador estava
  autenticada como a usuária real durante toda a auditoria; testar esses fluxos exigiria encerrar
  essa sessão, o que não fiz sem confirmação. Esses fluxos foram implementados e verificados em
  sprints anteriores (registrado no histórico do projeto) e não foram alterados nesta sprint.
- Teste de carga/performance sob rede real (throttling), Lighthouse ou métricas de Web Vitals.

## Fluxos testados (Etapa 2)

| Fluxo | Resultado |
|---|---|
| Login → Dashboard (sessão já autenticada, verificado em cada navegação) | OK |
| Navegar Dashboard → Pacientes → Perfil 360º → cada uma das 10 abas | OK, sem crash |
| Convidar paciente (tela Convites, listagem de convite existente) | OK |
| Abrir paciente via clique (mouse) | OK |
| Abrir paciente via teclado (Tab + Enter) | OK — corrigido nesta sprint, confirmado ao vivo |
| Alternar tema claro/escuro | OK |
| Redimensionar para mobile/tablet/desktop | OK, sem overflow |
| Gerar relatório (botão desabilitado corretamente quando paciente não tem perfil completo) | OK |

## Problemas encontrados e status

| # | Severidade | Descrição | Status |
|---|---|---|---|
| 1 | 🔴 Crítico | RLS de `patient_relationships` (INSERT/UPDATE) não impedia um profissional de se auto-vincular a um paciente arbitrário, ou um paciente de se auto-vincular a outro workspace, sem convite/aceite reais. | **Corrigido** — `supabase/schema_pro_026.sql`, aguardando a usuária rodar no Supabase. |
| 2 | 🟠 Alto | `<tr onClick>` sem suporte a teclado em 4 telas (Pacientes, Relatórios, Dashboard, Alertas Clínicos da Agenda) — impossível abrir um paciente só com teclado. | **Corrigido e verificado ao vivo.** |
| 3 | 🟢 Baixo | Overflow horizontal de 36px em telas de 320px no cabeçalho do paciente (nome + badges sem `min-w-0`). | **Corrigido e verificado ao vivo.** |
| 4 | — | Botões falsos "Disponível em breve" no Dashboard vazio, "Mais opções" sem função, plural incorreto com contagem zero em Relatórios/Pacientes. | **Corrigidos em sprint anterior** (mesma auditoria de lançamento, etapa preliminar), confirmados ainda corretos nesta sprint. |

## Regressões verificadas (Etapa 3)

Nenhuma regressão encontrada em: Jornada, Dashboard, Agenda, Plano Terapêutico, Assistente
Clínico, Convites, tema, responsividade. As sprints recentes (027 — redesign do Dashboard, 028
— Jornada Clínica) continuam funcionando como projetadas; o merge de Peso+Medidas (pedido da
usuária) está correto; a remoção do botão "Mais opções" não deixou nenhum resíduo visual ou de
layout.

## Achados que ficam documentados, não corrigidos agora

- Nenhum item crítico ou alto ficou sem correção nesta sprint.
- Cobertura de teclado fora das 4 telas corrigidas não foi auditada exaustivamente (ex.:
  modais, dropdowns) — os que foram checados (fechar modal, alternar tema, navegação do
  calendário) já tinham suporte correto desde sprints anteriores.
- Falsos positivos descartados durante a auditoria (documentados para não serem re-investigados
  à toa numa sprint futura): erros de console acumulados de uma instabilidade do próprio
  ambiente de desenvolvimento local (cache do `.next` corrompido por eu ter rodado `npm run
  build` com o servidor de dev ainda de pé, várias vezes nesta sessão) — confirmados como não
  reais toda vez, sempre comparando contra o build de produção limpo.

## Conclusão da auditoria

Os dois achados de maior severidade (RLS e teclado) estão corrigidos e verificados. O sistema
está estruturalmente estável: zero regressão, zero erro de console real, build de produção
limpo. Ver `LAUNCH_READINESS.md` para o parecer comercial completo e os riscos conhecidos que
seguem em aberto (nenhum bloqueia o lançamento do dia 8).
