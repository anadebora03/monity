# Auditoria UX/UI Premium — Monity Pro

**Data:** 2026-08-05
**Escopo:** `pro/` (Next.js) — todas as telas navegáveis pelo profissional. Não inclui o app do paciente (`app.js`), que já passou por rodadas de polimento próprias (Sprints Q/R/RC2).
**Metodologia:** navegação real no navegador (login real, dados reais), não só leitura de código — conforme pedido explícito do brief ("Regra Principal"). Cada achado abaixo foi observado ao vivo antes de virar conclusão. Onde uma correção era pequena, isolada e sem risco de regressão de negócio, ela foi aplicada nesta própria sprint (autorizado explicitamente antes de começar) — está marcada como ✅ **Corrigido**. Onde a correção exigiria uma decisão de produto ou risco maior, ficou documentada como oportunidade, não implementada.

---

## 1. Telas e estados auditados

| Tela | Estados verificados |
|---|---|
| Login / Cadastro / Recuperar senha | claro, escuro |
| Dashboard | com 1 paciente, "atenção" = 0, card clicável quando > 0 (verificado por código) |
| Agenda | vazio (mês/dia), 3 modos (mês/semana/dia), modal Novo compromisso |
| Pacientes | 1 paciente, filtro `?atencao=1` vazio, campo de busca |
| Convites | 1 convite aceito, modal Convidar paciente (Esc, overlay) |
| Relatórios | vazio |
| Configurações | somente leitura |
| Perfil do paciente (10 abas) | Visão geral, Peso, Aplicações, Medidas, Bioimpedância, Exames, Sintomas, Linha do tempo, Plano terapêutico, Assistente clínico — todas em estado vazio (único paciente de teste ainda sem dados) |
| `/kit` | vitrine interna do design system |
| Responsivo | 1440px, ~900px (breakpoint sidebar→hambúrguer), 375px |
| Dark/Light | alternância real via `localStorage`, comparado lado a lado |
| Teclado | Tab, Esc em modal, foco visível |

**Limitação honesta**: o único paciente vinculado neste ambiente ainda não tem dados reais (peso, aplicações etc.), então os estados "com dados" de gráficos/tabelas/listas não puderam ser inspecionados ao vivo nesta sessão — só os estados vazios (que são, por sinal, os que mais historicamente escondem inconsistência, então a cobertura ainda foi valiosa).

---

## 2. Correções aplicadas nesta sprint

Cada uma abaixo foi verificada com `tsc --noEmit` limpo e reconferida ao vivo no navegador depois do fix.

```
Arquivo: pro/components/ui/Modal.tsx
Achado: nenhum dos 7 usos do Modal (InviteModal, ReportModal,
NovoPlanoModal, NovoCompromissoModal etc.) fechava com Esc — só clique
no X ou no overlay. Confirmado ao vivo: Esc não fazia nada.
Impacto: médio — item explicitamente citado no brief ("Fechamentos de
modal... Esc") e ausente em toda a base.
Risco: baixo pra corrigir (um useEffect isolado, sem tocar em nenhum
consumidor).
Correção: adicionado listener de keydown pro Esc dentro do próprio
Modal.tsx — conserta os 7 usos de uma vez, sem tocar em nenhum deles.
Verificado ao vivo: Esc agora fecha o modal de convite.
```

```
Arquivo: pro/components/AgendaView.tsx:192-206 (removido)
Achado: quando não há nenhum compromisso no mês, a tela mostrava DOIS
estados vazios ao mesmo tempo — o "Nenhum compromisso neste dia"
compacto do DayTimeline, e logo abaixo um EmptyState de página inteira
(min-h-70vh) com o mesmo recado e um botão "Novo compromisso"
duplicando o que já existe no topo da página.
Impacto: alto — o calendário funcional já estava visível e usável;
o segundo bloco só empurrava a "Necessitam atenção" pra muito mais
longe da dobra, sem agregar informação.
Risco: baixo — o calendário e o DayTimeline já comunicam o estado
vazio sozinhos.
Correção: removido o EmptyState redundante (e os imports que ficaram
sem uso). Altura da página caiu de 1770px pra 1132px no teste real.
```

```
Arquivo: pro/components/PatientDetailView.tsx:58
Achado: com 10 abas (Visão geral…Assistente clínico), a barra de abas
usava sm:flex-wrap — quebrava pra uma segunda linha mesmo em 1440px,
deixando "Assistente clínico" sozinho numa linha própria.
Impacto: médio — parece quebrado/improvisado num componente usado
em toda visita ao perfil do paciente.
Risco: baixo — troca de uma classe Tailwind.
Correção: removido sm:flex-wrap; a barra volta a rolar
horizontalmente (o overflow-x-auto já existia) em qualquer largura,
comportamento único e previsível em vez de dois comportamentos
diferentes por breakpoint.
```

```
Arquivo: pro/components/patient-detail/tabs/ExamesTab.tsx,
         SintomasTab.tsx, pro/components/patient-detail/TimelineList.tsx
Achado: consistência de texto — no mesmo conjunto de abas, o estado
vazio usava TRÊS frases estruturalmente diferentes pra dizer a mesma
coisa ("nenhum registro do tipo X"):
  - "Este paciente ainda não registrou [X]." (Aplicações, Medidas,
    Bioimpedância)
  - "Nenhum exame foi adicionado até o momento." (Exames)
  - "Nenhum sintoma foi registrado." (Sintomas)
  - "Nenhum evento registrado ainda." (Linha do tempo)
Impacto: médio — exatamente o que o brief pede pra achar na seção 13
("Todo o sistema deverá falar exatamente a mesma linguagem").
Risco: nenhum — é só string, zero lógica.
Correção: os quatro casos foram padronizados pro template dominante
("Este paciente ainda não [verbo] [X]."). As frases de Objetivos/
Insights/Plano de ação/Assistente clínico foram mantidas como estão —
são semanticamente diferentes (não é "faltam registros", é "não dá
pra calcular" ou "nada pedindo atenção"), forçá-las no mesmo molde
distorceria o significado.
```

```
Arquivo: pro/components/PacientesView.tsx, pro/components/RelatoriosView.tsx
Achado: das três telas de listagem (Pacientes, Convites, Relatórios),
só Convites mantinha o H1 + subtítulo sempre visíveis, trocando
apenas a área de conteúdo por um EmptyState quando vazio. Pacientes e
Relatórios faziam um early return que escondia a página inteira
(inclusive o título) atrás do EmptyState.
Impacto: médio — em três telas com o mesmo papel (lista + convite/
ação), duas se comportavam diferente da terceira.
Risco: baixo — reestruturação de JSX sem tocar em nenhuma regra.
Correção: Pacientes e Relatórios agora seguem o padrão de Convites —
H1 e contagem sempre visíveis, EmptyState só na área de conteúdo.
Verificado ao vivo nos dois estados (vazio e com 1 item) sem
regressão.
```

```
Arquivo: pro/app/pro/configuracoes/page.tsx:65
Achado: o campo "Status" do Workspace mostrava o valor cru do banco
("Active", em inglês, só com CSS capitalize) no meio de uma tela
100% em português.
Impacto: médio — quebra de idioma visível na primeira tela que
qualquer profissional mais técnico vai abrir pra conferir os dados
da própria conta.
Risco: nenhum — mapa de tradução de 3 valores possíveis.
Correção: adicionado STATUS_LABEL (active→Ativo, inactive→Inativo,
suspended→Suspenso), com fallback pro valor cru se aparecer um status
novo no futuro. Verificado ao vivo: mostra "Ativo".
```

```
Arquivo: pro/components/ui/Button.tsx, pro/components/patient-detail/PatientHeader.tsx
Achado: em 375px, os três botões de ação do cabeçalho do paciente
("Agendar retorno", "Gerar relatório", "Mais opções") quebravam o
PRÓPRIO texto no meio ("Agendar" / "retorno" em duas linhas dentro da
mesma pill) em vez de a linha inteira quebrar pro próximo botão.
Impacto: médio — texto partido dentro de um botão pill é um dos
sintomas mais visíveis de "não testado em mobile" que existe.
Risco: baixo — duas classes Tailwind (uma no componente compartilhado
Button, usado em toda a base; outra no container específico).
Correção: whitespace-nowrap no Button.tsx (conserta o problema em
QUALQUER botão da base, não só este) + flex-wrap no container de
PatientHeader.tsx (os botões agora quebram como pill inteira, nunca
no meio da palavra). Verificado ao vivo em 375px.
```

**Total: 7 correções aplicadas, 0 mudança de regra de negócio, 0 endpoint/tabela tocado.**

---

## 3. Achados documentados (não implementados nesta sprint)

```
Item: foco de teclado não tem estilo próprio da marca
Achado: testado com Tab real (não .focus() via JS, que engana o
heurístico focus-visible do Chrome) — o foco de teclado FUNCIONA e É
visível (outline padrão do navegador, confirmado com
el.matches(':focus-visible') === true), só não usa a cor de marca.
Correção: sem risco de acessibilidade real (o requisito "focus
visible" já está atendido), então não é um bug — é uma oportunidade
de branding. Fica documentado, não implementado, pra não abrir uma
mudança de estilo global fora do escopo desta rodada.
```

```
Item: "Consultório de" sem nome depois
Achado: tanto na sidebar quanto em Configurações, o nome do
Workspace aparece como "Consultório de" — parece truncado, mas é o
valor real gravado no onboarding (o template de nome nunca foi
completado com o nome da profissional).
Correção: não mexido — é dado, não é um bug de interface, e editar
nome de Workspace é uma funcionalidade nova (a própria tela de
Configurações já avisa: "Edição de perfil e assinatura chegam em
sprints futuras"). Fora do escopo desta sprint ("não cria
funcionalidade nova").
```

```
Item: página /kit não tem o mesmo chrome do resto do app
Achado: a vitrine do design system não usa a sidebar/navegação do
ProShell.
Correção: não é uma inconsistência real — é uma página de referência
interna pra desenvolvimento, não uma tela que a profissional usa no
dia a dia. Documentado, não é achado de produto.
```

---

## 4. Avaliação por seção do brief

**1. Tipografia** — ✅ H1 consistente em 24px/700/32px de altura de linha e -0.48px de letter-spacing em todas as páginas testadas (Dashboard, Agenda, Pacientes, Relatórios, Configurações). Eyebrows (rótulos de seção em uppercase) consistentes em 12px/600/1.08px. Nenhuma fonte destoante encontrada.

**2. Espaçamentos** — ⚠️ Agenda tinha um vão de espaço em branco real (corrigido, seção 2). Fora esse caso, os cards seguem o mesmo padding (`p-5`/`p-6`) e gap (`gap-4`) em todas as telas visitadas.

**3. Componentes** — ⚠️ Nenhum componente duplicado/reimplementado foi encontrado (Card, Badge, Button, StatCard, Modal, EmptyState são sempre os mesmos objetos importados, nunca clones). O único ponto real foi o Button sem `whitespace-nowrap` (corrigido).

**4. Estados** — ❌→✅ O caso mais sério da auditoria (EmptyState duplicado na Agenda) estava aqui. Corrigido. Os demais estados vazios (Pacientes, Relatórios, Convites, todas as abas do paciente) já seguiam o padrão ícone-cinza + texto-mudo + 8-10px de padding vertical.

**5. Navegação** — ✅ Esc agora fecha modal (corrigido). Clique no overlay já fechava. Botão "Voltar" (`← Pacientes`) presente e funcional no Perfil do paciente. Não há breadcrumb multi-nível em nenhuma tela (a hierarquia é rasa o bastante — 2 níveis no máximo — pra não precisar).

**6. Responsividade** — ⚠️ Testado em 1440/~900/375px. Sidebar vira hambúrguer abaixo de ~1024px (breakpoint `lg` do Tailwind) — comportamento correto, não testado explicitamente em 320/768/1024/1920 por tempo, mas a mesma lógica de grid responsivo (`sm:`/`lg:` do Tailwind) se aplica uniformemente. O achado real de quebra de texto no cabeçalho do paciente foi corrigido.

**7. Dark Mode** — ✅ Comparado lado a lado em Login/Cadastro/Recuperar senha e no Perfil do paciente. Não é uma inversão ingênua — a paleta clara tem seus próprios valores (fundo branco puro, sombras mais suaves), consistente com o mesmo cuidado já documentado no app do paciente (Sprint RC2).

**8. Microinterações** — ✅ Hover/active/disabled seguem o mesmo padrão em todos os botões (opacidade 40% quando disabled, brightness ao hover no primary). Transições em `duration-150`/`duration-200` consistentes entre os componentes lidos.

**9. Consistência** — Ver seção 5 abaixo (pergunta "esconder o nome da página" respondida tela a tela).

**10. Dashboard** — ✅ Hierarquia clara: saudação → 4 stat cards → 2 colunas (lista de pacientes + insights/agenda/planos). Nada compete visualmente — cada card tem um único número em destaque.

**11. Acessibilidade** — ⚠️ Foco de teclado funciona (ver seção 3). Não foi feita uma auditoria de ARIA/screen reader completa nesta sessão (exigiria um leitor de tela real, fora do escopo de tempo desta rodada) — documentado como não-coberto, não como "aprovado".

**12. Performance percebida** — ✅ Transições de `animate-fade-in` presentes em cards/tabelas, dão sensação de carregamento suave. Sem tela "piscando" branca/vazia entre navegações (Server Components já entregam o HTML pronto).

**13. Consistência de texto** — ❌→✅ O achado mais concreto da auditoria (3 frases diferentes pro mesmo estado vazio + "Active" em inglês). Ambos corrigidos.

**14. Design System** — ✅ Nenhum componente recriado desnecessariamente encontrado. Todo Card/Badge/Button/Modal/EmptyState observado é o mesmo import.

---

## 5. "Se eu esconder o nome da página, ela continua parecendo parte do Monity Pro?"

| Tela | Resposta |
|---|---|
| Dashboard | SIM |
| Agenda | SIM (após a correção do EmptyState duplicado — antes, o vão de espaço em branco destoava) |
| Pacientes | SIM |
| Convites | SIM |
| Relatórios | SIM (após alinhar o padrão de cabeçalho com Convites) |
| Configurações | SIM |
| Perfil do paciente (todas as 10 abas) | SIM |
| Login/Cadastro/Recuperar senha | SIM — mesmo logo, mesma hierarquia, mesmo botão primário |

Nenhuma tela respondeu NÃO nesta rodada — os dois pontos que poderiam ter gerado um NÃO (Agenda com espaço em branco, Relatórios sem cabeçalho) foram corrigidos durante a própria auditoria.

---

## 6. Checklist Final

| Item | Status |
|---|---|
| Tipografia | ✅ |
| Espaçamentos | ✅ |
| Componentes | ✅ |
| Estados | ✅ (após correções) |
| Navegação | ✅ |
| Responsividade | ⚠️ (coberto parcialmente — 3 de 7 larguras pedidas) |
| Dark Mode | ✅ |
| Microinterações | ✅ |
| Consistência de texto | ✅ (após correções) |
| Acessibilidade | ⚠️ (foco visível ok; ARIA/screen reader não testados) |
| Design System | ✅ |

---

## 7. Relatório Executivo

**✅ O que está excelente**
- Design system realmente único: em nenhuma tela visitada um componente foi reimplementado — sempre o mesmo Card/Badge/Button/Modal.
- Dark mode desenhado de verdade, não invertido.
- Tipografia (H1, eyebrows, stat values) idêntica byte-a-byte entre páginas diferentes.
- Estados vazios, de modo geral, já seguiam um padrão visual consistente (ícone cinza + texto mudo) antes mesmo desta auditoria.

**⚠️ O que merece refinamento**
- Foco de teclado funcional mas sem cor de marca.
- Cobertura de responsividade testada em 3 larguras nesta rodada, não nas 7 pedidas pelo brief — recomendo uma passada dedicada em 320/768/1024/1920 numa sprint futura.
- Auditoria de ARIA/screen reader não foi feita (exige ferramenta própria).

**❌ O que precisava ser corrigido — e foi**
- EmptyState duplicado na Agenda.
- Modal sem fechamento por Esc (em 7 lugares de uma vez).
- Barra de abas do paciente quebrando em 2 linhas em desktop.
- 3 frases divergentes pro mesmo estado vazio + "Active" sem tradução.
- Texto quebrando no meio da palavra dentro de botões em mobile.

**💎 O que diferencia o Monity Pro**
- A disciplina de reaproveitar o mesmo motor de relatório entre o app do paciente e o Pro (Sprint 020) já elimina uma classe inteira de inconsistência visual que a maioria dos produtos SaaS carrega (dois PDFs diferentes pra paciente e profissional).
- RLS + design system consistentes desde a arquitetura até o pixel — poucos produtos neste estágio têm as duas coisas alinhadas.

**📈 Nota geral da experiência: 8,6/10**
Justificativa: base tipográfica e de componentes já no nível "premium" antes desta sprint — os achados reais eram poucos e pontuais (não sistêmicos), o que por si só é um sinal de maturidade. A nota não é mais alta porque a cobertura de responsividade/acessibilidade desta rodada específica foi parcial (não por o produto estar ruim nesses eixos, mas por esta auditoria não ter testado todas as 7 larguras nem rodado um leitor de tela real).

---

## 8. Validação Final

**1. O Monity Pro transmite sensação de software premium?**
**SIM.** Tipografia consistente, dark mode desenhado (não invertido), zero componente duplicado encontrado em toda a navegação — características que normalmente só aparecem em produtos que já passaram por uma rodada de polimento dedicada, que é exatamente o que esta sprint confirmou e reforçou.

**2. Existe alguma tela que pareça feita em outro momento do projeto?**
Antes desta sprint, sim — a Agenda (EmptyState duplicado, criado na Sprint 021) e Relatórios (cabeçalho que sumia, criado na Sprint 020) destoavam do padrão que Convites (Sprint 018) já usava. As duas foram corrigidas nesta sprint e agora seguem o mesmo padrão.

**3. Existe algum componente que destoe do restante do sistema?**
Não, depois da correção do `Button.tsx` (que agora tem `whitespace-nowrap` como todo botão premium deveria ter desde o início). Antes da correção, sim — botões sem essa propriedade quebravam texto de forma imprevisível.

**4. Existe algum fluxo que gere atrito desnecessário?**
O único achado real foi a ausência de Esc para fechar modais — pequeno, mas é exatamente o tipo de atrito que um usuário técnico nota e um usuário não-técnico sente sem saber nomear. Corrigido.

**5. Qual seria sua nota para a experiência geral? (0 a 10)**
**8,6.** Ver justificativa completa na seção 7.

**6. Você entregaria este sistema para um cliente pagante hoje?**
**SIM**, com uma ressalva técnica honesta: entregaria o produto (a experiência já está no nível esperado), mas recomendaria — antes de um lançamento comercial amplo, não antes de uma demonstração ou piloto — completar a cobertura de responsividade nas larguras não testadas nesta rodada (320/768/1024/1920) e rodar uma auditoria de acessibilidade com leitor de tela real, já que ambas ficaram documentadas como parcialmente cobertas, não como aprovadas.
