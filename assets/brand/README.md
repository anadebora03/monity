# assets/brand — origem oficial da identidade visual (Monity)

**Status: registrado oficialmente na Sprint RB-01 (2026-08-07).**

- **master/** — arquivos originais da identidade visual. É a **fonte da verdade única**.
  Qualquer asset novo (ícone, favicon, splash, imagem de PDF/e-mail, banner) deve ser derivado
  exclusivamente destes arquivos.
- **export/** — versões já exportadas nos tamanhos/formatos que o sistema consome (ícones PWA,
  favicons, manifest, Apple touch icon, maskable icons, logo da landing). Gerado a partir de
  `master/` — nunca editado manualmente, nunca a fonte de uma nova exportação.

## Regra vigente a partir desta sprint

Nenhum componente do projeto (PWA raiz, `pro/`, `landing/`) pode referenciar imagens antigas da
marca Compasso. Todo asset visual novo referencia `assets/brand/master/` (diretamente ou via
`assets/brand/export/`, depois de gerado a partir do master). Isso vale para código novo a
partir de agora — a substituição dos assets já em uso no sistema (ícones em `icons/`, logo em
`landing/public/brand/`) acontece na Sprint RB-02, ainda não executada.

## Inventário — arquivos em `master/`

| Arquivo | Conteúdo | Status |
|---|---|---|
| `monity-icon-blue.png` | Ícone (M+check), fundo degradê azul — versão principal | ok |
| `monity-icon-dark.png` | Ícone, fundo azul-marinho escuro | ok |
| `monity-icon-light.png` | Ícone, fundo claro | **defeituoso** — veio borrado, fundo cinza ruidoso (não branco limpo), formato paisagem 1536×1024 em vez de quadrado. Não usar até ser regerado. |
| `monity-wordmark-dark.png` | Palavra "monity" branca | fundo preto sólido com glow, **não é transparente** como especificado |
| `monity-wordmark-light.png` | Palavra "monity" azul | fundo cinza claro sólido, **não é transparente** como especificado |
| `monity-logo-dark.png` | Lockup vertical (ícone + wordmark + tagline), fundo navy | ok |
| `monity-logo-light.png` | Lockup vertical (ícone + wordmark + tagline), fundo claro | ok |
| `monity-logo-primary-dark.png` | Lockup horizontal (ícone + wordmark, sem tagline), fundo navy | ok — extra, não estava na lista original, mantido |
| `monity-logo-institutional-dark.png` | Lockup horizontal (ícone + wordmark + tagline), fundo navy | ok — extra, não estava na lista original, mantido |

## Sprint RB-02 — exports gerados e distribuídos (2026-08-07)

Script `export/generate-exports.ps1` (PowerShell + GDI+, único recurso de manipulação de
imagem disponível no ambiente — não há ImageMagick/Python/sharp instalados) gera, a partir de
`master/monity-icon-blue.png`:

- `export/icons/`: `icon-512.png`, `icon-192.png`, `icon-512-maskable.png`,
  `icon-192-maskable.png`, `apple-touch-icon.png` (180×180), `favicon-32.png`, `favicon-16.png`,
  `favicon.ico` (multi-tamanho 16/32/48).
- `export/landing/`: `logo-mark.png` (256×256), `apple-touch-icon.png`.

Distribuído para:
- `icons/*.png` e `favicon.ico` (raiz) — ícones do Monity App (PWA do paciente).
- `landing/public/brand/logo-mark.png`, `apple-touch-icon.png`, `landing/app/favicon.ico` —
  landing page.
- `pro/app/icon.png`, `pro/app/apple-icon.png` (convenção de arquivo do Next.js App Router) —
  Monity Pro não tinha favicon próprio antes desta sprint; agora tem.
- `pro/public/brand/monity-icon.png` — consumido por `pro/components/ui/Logo.tsx`.

**Substituição da marca desenhada à mão**: além dos favicons, dois pontos desenhavam a marca
antiga (seringa + anel) via SVG inline em vez de usar um asset — corrigidos nesta sprint:
- `pro/components/ui/Logo.tsx` — desenhava um ícone próprio em SVG; agora renderiza
  `<img src="/brand/monity-icon.png">`. Usado em Login, Cadastro, Sidebar, Onboarding, `/kit`.
- `app.js` (`logoSVG()`/`logoHeroSVG()`) — desenhava a seringa/anel via `<svg>` com cores por
  CSS var; agora retorna `<img src="icons/icon-512.png">`. Usado em 13 pontos (topbar, tela de
  Boas-vindas/splash, Minha Jornada, etc.).
- `js/report-engine.js` (masthead do PDF) — desenhava um losango abstrato via `<svg>`; agora
  usa uma cópia do ícone embutida como `data:image/png;base64,...` (64×64) diretamente no HTML,
  porque o PDF é montado numa janela nova via `window.open('','_blank')` sem base URL — um
  caminho relativo não resolveria.
- `pro/app/onboarding/OnboardingWizard.tsx` — o badge "M" desenhado à mão na tela de boas-vindas
  virou `<Logo size={56}/>`.

**Trade-off documentado**: os pontos acima trocaram SVG vetorial themeable (cor via
`var(--accent)`, se adapta a claro/escuro automaticamente) por um PNG raster com fundo próprio
fixo. Aceitável porque o ícone `monity-icon-blue.png` já é autocontido (tem fundo azul embutido,
funciona igual nos dois temas) — mas se no futuro for necessário um SVG vetorial de verdade
(ex: para redesenhar em outra cor), ele precisa ser desenhado a partir do zero ou pedido à
autora do design original — não existe uma versão vetorial nos arquivos master hoje (são todos
PNG rasterizados).

`manifest.json`, `index.html` (favicons) e `sw.js` (`CACHE_VERSION`) tiveram os `?v=N` de
cache-busting incrementados pra forçar quem já tinha o app instalado a buscar os ícones novos.

Verificado: `tsc --noEmit` e `npm run build` limpos em `pro/` e `landing/`; `node --check` em
`app.js` e `js/report-engine.js`; carregamento ao vivo confirmado (200 OK, sem erro de console)
no app do paciente (splash) e no Monity Pro (login).

## Decisões (2026-08-07)

- **`monity-icon-light.png`** — defeituoso (borrado, não quadrado). Decisão: usar
  `monity-icon-blue.png` como fallback em qualquer exportação que precisaria da variante clara,
  documentado como pendência. Trocar pelo arquivo certo assim que for regerado.
- **`monity-wordmark-dark.png` / `monity-wordmark-light.png`** — sem transparência real.
  Decisão: regerar com fundo transparente antes de usar isoladamente. Até a nova versão
  chegar, exports que dependem do wordmark isolado (não do lockup completo, que já está ok)
  ficam pendentes.
