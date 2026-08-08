/* Sprint 020 — copia os motores compartilhados (js/timeline.js,
   js/insights.js, js/actionplan.js, js/report-engine.js — a mesma
   fonte que o app do paciente carrega) pra pro/public/shared-engine/,
   rodado antes de dev/build (ver package.json: predev/prebuild).

   Por quê copiar em vez de importar direto: o deploy do Pro na Vercel
   empacota só o diretório pro/ (foi assim que "vercel link"/"vercel
   deploy" rodaram, a partir de dentro de pro/) — arquivos fora dessa
   pasta não existem no ambiente de produção. Copiar em build-time
   garante que nunca existe uma cópia editada à mão: toda vez que o
   Pro builda, ele pega os arquivos exatamente como estão em js/ na
   raiz do repo. Não é duplicação de código — é o único jeito de
   servir o MESMO arquivo pros dois deploys sem virar um monorepo com
   workspace de verdade (fora de escopo desta sprint). */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(REPO_ROOT, 'js');
const OUT_DIR = path.join(__dirname, '..', 'public', 'shared-engine');

const FILES = ['timeline.js', 'insights.js', 'actionplan.js', 'report-engine.js'];

if (!fs.existsSync(SRC_DIR)) {
  // Build remoto na Vercel: só pro/ é enviado, js/ da raiz do repo não
  // existe nesse ambiente. Mantém as cópias já commitadas em
  // public/shared-engine/ (sincronizadas no último "npm run build"
  // local) em vez de falhar o build — só quem builda localmente com o
  // monorepo completo consegue de fato atualizar essas cópias.
  console.log('[sync-shared] js/ da raiz não encontrado (build remoto) — mantendo cópias já commitadas em public/shared-engine/.');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const file of FILES) {
  const src = path.join(SRC_DIR, file);
  const dest = path.join(OUT_DIR, file);
  const content = fs.readFileSync(src, 'utf8');
  const banner = `/* SINCRONIZADO automaticamente de js/${file} (raiz do repo) — não editar aqui.\n   Rodar "node scripts/sync-shared.js" (ou npm run dev/build) pra atualizar. */\n`;
  fs.writeFileSync(dest, banner + content, 'utf8');
  console.log(`[sync-shared] ${file} -> public/shared-engine/${file}`);
}
