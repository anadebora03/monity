# Monity Pro — Launch Readiness (Sprint 034)

Parecer técnico final antes da apresentação para 200+ profissionais de saúde (08/08) e da
integração com a Eduzz. Ver `QA_REPORT.md` para o detalhamento fluxo a fluxo.

## Pontos fortes da plataforma

- **Arquitetura de segurança "RLS-first"**: nenhuma tela confia em lógica de permissão no
  frontend — todo isolamento entre workspaces é garantido no banco. A auditoria desta sprint
  encontrou uma falha real nessa camada (ver Riscos), mas confirmou que o resto do desenho —
  23 tabelas, todas com RLS habilitado, o padrão `select_pro` reaproveitado de forma idêntica
  nas 8 tabelas de dados do paciente — está correto.
- **Jornada Clínica** (Sprint 028): narrativa cronológica única reunindo 15 tipos de evento,
  sem nenhuma tabela nova, com paginação progressiva e busca — testada com dados sintéticos
  ricos e com a conta real, sem crash em nenhum dos dois casos.
- **Dashboard como central de trabalho** (Sprint 027): cabeçalho dinâmico, prioridades
  clínicas calculadas em lote (nunca uma consulta por paciente), zero informação duplicada.
- **Design System consistente**: um único conjunto de componentes (`Card`, `Button`, `Badge`,
  `Modal`) reaproveitado em toda a aplicação — nenhum componente legado encontrado nesta
  auditoria.
- **Tema escuro real**, não uma inversão de cores — paleta própria, contraste verificado.
- **Zero regressão** encontrada nas sprints recentes; build de produção limpo em todas as
  verificações desta sessão.

## Problemas encontrados nesta sprint

Ver tabela completa em `QA_REPORT.md`. Resumo: 1 crítico (RLS), 1 alto (teclado), 1 baixo
(overflow em tela muito estreita) — os três corrigidos e verificados.

## Correções realizadas

1. RLS de `patient_relationships` — `supabase/schema_pro_026.sql` (**aguardando a usuária
   rodar no SQL Editor do Supabase — não é efetivo até isso acontecer**).
2. Navegação por teclado em 4 telas de listagem de pacientes.
3. Overflow de 320px no cabeçalho do Perfil 360º.
4. (Sprint anterior, mesma auditoria de lançamento) CTAs falsos no Dashboard vazio, botão sem
   função no cabeçalho do paciente, plural incorreto com contagem zero.

## Problemas adiados (documentados, não bloqueiam o lançamento)

- **Configurações não permite autoedição** de nome/perfil/workspace — mensagem própria da
  tela já avisa "chegam em sprints futuras". Isso significa que a conta de demonstração da
  usuária (nutridmelo@gmail.com) precisa do ajuste manual de dados (SQL já entregue em sprint
  anterior) se for usada ao vivo na palestra.
- Cobertura de teclado não foi auditada em modais/dropdowns além dos já verificados
  (fechar modal, alternar tema, navegação do calendário — todos corretos).
- Nenhum teste de carga real (Lighthouse, throttling de rede, volume real de pacientes) —
  ver risco técnico abaixo.

## Riscos conhecidos

- **RLS pendente de aplicação**: a correção de segurança mais importante desta sprint só entra
  em vigor quando o SQL for executado. Até lá, a falha original continua presente em produção.
- **Falta de prova em volume real**: a arquitetura (paginação da Jornada, agenda por mês,
  view agregada `workspace_patient_summary`) foi desenhada para escalar, mas isso nunca foi
  observado com múltiplos profissionais/pacientes reais simultâneos — só com 1 paciente de
  teste sem histórico.
- **Login/Cadastro/Recuperação de senha não foram re-testados nesta sessão** (a sessão do
  navegador estava autenticada durante toda a auditoria) — foram implementados e verificados em
  sprints anteriores, mas valeria a usuária confirmar pessoalmente antes do dia 8, já que é a
  primeira coisa que qualquer um dos 200 profissionais vai tocar.

## Melhorias para futuras versões

- Autoedição de perfil/workspace em Configurações.
- Mini-mapa de jornada estilo GitHub (já sugerido e adiado pela própria usuária).
- Testes de carga formais (Lighthouse/Web Vitals) antes de uma base de clientes maior.
- Auditoria de teclado mais ampla (modais, formulários) numa sprint dedicada de acessibilidade.

## Checklist de lançamento

- [x] Fluxos principais testados de ponta a ponta
- [x] Nenhum bug crítico aberto *(condicionado a rodar `schema_pro_026.sql`)*
- [x] Nenhuma regressão encontrada
- [x] Responsividade validada (320–1440px)
- [x] Dark mode validado
- [x] Build de produção limpo, zero erro de console real
- [ ] `schema_pro_026.sql` executado no Supabase de produção — **ação da usuária**
- [ ] Conta de demonstração com nome/workspace corretos, se for usar a mesma no dia da palestra
- [ ] Login/Cadastro confirmados pessoalmente pela usuária antes do dia 8

---

## Validação Final

**1. Você entregaria este sistema para um cliente pagante hoje?**
**SIM, condicionado a rodar `schema_pro_026.sql` antes.** Sem essa correção eu responderia NÃO
— é uma falha real de isolamento de dados de saúde entre profissionais, inaceitável num produto
comercial de saúde. Com a correção aplicada, sim: o restante da plataforma é estável, consistente
e não tem nenhum outro problema de severidade crítica ou alta em aberto.

**2. Existe algum bug que impeça o lançamento? Se existir, listar.**
Só um, e é uma ação pendente, não um bug sem solução: o SQL de correção do RLS
(`schema_pro_026.sql`) precisa ser executado no Supabase antes do lançamento comercial. Fora
isso, nenhum bug conhecido bloqueia o lançamento.

**3. Existe alguma funcionalidade que ainda transmita sensação de MVP?**
Sim, uma: **Configurações não permite editar o próprio perfil/workspace** — a própria tela
avisa isso ("chegam em sprints futuras"). Não é um bug, é uma lacuna de funcionalidade honesta,
mas é o único lugar do sistema onde um profissional percebe algo "ainda por vir" em vez de uma
plataforma completa.

**4. Qual é hoje o maior risco técnico do projeto?**
A plataforma nunca foi observada sob volume real — múltiplos profissionais, múltiplos
pacientes, anos de histórico simultâneo. A arquitetura foi desenhada pra isso (paginação,
consultas em lote, views agregadas), e a revisão de código não encontrou nenhum padrão N+1 ou
consulta sem escopo, mas isso é uma garantia de design, não uma prova empírica. O segundo maior
risco é logístico, não técnico: a correção de segurança só protege o sistema depois de aplicada.

**5. Nota da plataforma (0 a 10, por categoria):**

| Categoria | Nota | Justificativa |
|---|---|---|
| Arquitetura | 9,0 | RLS-first consistente, migrações idempotentes, camada de dados bem separada, mesmos padrões reaproveitados em 15+ sprints sem retrabalho. |
| UX | 8,5 | Dashboard e Jornada redesenhados com hierarquia clara; falta validação com nutricionistas reais fora desta equipe. |
| UI | 8,5 | Design System consistente, dark mode real, responsivo até 320px sem overflow. |
| Performance | 8,0 | Padrões corretos por design (paginação, lote); nunca medida com ferramenta formal (Lighthouse) nem sob volume real. |
| Segurança | 8,0 | Correta em todo o resto do sistema; a nota reflete que a falha encontrada era real e só é corrigida quando o SQL for aplicado. |
| Escalabilidade | 8,0 | Arquitetura pronta; não comprovada com volume real ainda. |
| Confiabilidade | 8,5 | Zero crash em toda a navegação testada, zero regressão, build sempre limpo. |

**6. Nível de confiança para apresentar esta plataforma para mais de 200 profissionais de saúde?**
**90%**, condicionado a rodar o SQL de segurança antes do dia 8. Os 10% restantes refletem o que
não pôde ser comprovado nesta sessão com evidência direta: login/cadastro não re-testados ao
vivo, e nenhuma prova de comportamento sob carga real. Nada disso é um problema conhecido — é
apenas o que ainda não foi observado.

**7. O Monity Pro está pronto para iniciar sua operação comercial?**
**SIM**, com três condições concretas e pequenas, não estruturais: (1) executar
`schema_pro_026.sql` no Supabase de produção; (2) se a conta nutridmelo@gmail.com for usada na
demonstração ao vivo, garantir que nome/workspace estejam corretos (SQL já entregue em sprint
anterior); (3) a usuária confirmar pessoalmente o fluxo de Login/Cadastro antes do dia 8, já que
é o único fluxo core desta auditoria que não pôde ser re-testado nesta sessão por já estar
autenticada. Nenhuma dessas três condições exige desenvolvimento novo — são verificações e uma
migração de banco já escrita e entregue.
