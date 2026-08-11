#!/usr/bin/env node
/* Testes locais do webhook da Eduzz (item 17 do brief da Sprint
   Integração Eduzz) — roda contra um `npm run dev` já de pé.
   Payload no formato REAL documentado em
   developers.eduzz.com/reference/webhook/myeduzz-contract-created
   (não inventado), só com IDs de produto/contrato fictícios pra não
   colidir com nada real.

   Uso: node scripts/test-eduzz-webhook.mjs [baseUrl]
   Requer EDUZZ_WEBHOOK_SECRET no ambiente (mesmo valor do .env.local
   usado pelo `next dev`), pra poder assinar as requisições de teste. */

import { createHmac } from 'node:crypto';

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const URL = `${BASE_URL}/api/eduzz/webhook`;
const SECRET = process.env.EDUZZ_WEBHOOK_SECRET;

if (!SECRET) {
  console.error('Defina EDUZZ_WEBHOOK_SECRET no ambiente (mesmo valor do .env.local) antes de rodar este script.');
  process.exit(1);
}

function sign(body) {
  return createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');
}

function contractCreatedPayload({ eventId, productId }) {
  return {
    id: eventId,
    event: 'myeduzz.contract_created',
    data: {
      producer: { id: '37296411', name: 'Monity Teste', email: 'qa@usemonity.com.br' },
      products: [{ id: productId, name: 'Produto de teste', price: { currency: 'BRL', value: 10 } }],
      contract: {
        id: `test-contract-${eventId}`,
        payment: { method: 'creditCard', totalOfInstallments: 12 },
        status: 'upToDate',
        trialDays: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recurrence: {
          startsAt: new Date().toISOString(),
          nextDue: new Date(Date.now() + 30 * 86400000).toISOString(),
          currentDue: new Date().toISOString(),
          lastDue: '',
          finishesAt: '',
          frequency: { type: 'month', value: 1 },
          price: { currency: 'BRL', value: 10 },
        },
      },
      customer: { name: 'Comprador Teste', email: 'comprador.teste@usemonity.com.br', phone: { countryCode: '55', areaCode: '15', number: '999999999' } },
    },
    sentDate: new Date().toISOString(),
  };
}

async function post(payload, { badSignature = false } = {}) {
  const body = JSON.stringify(payload);
  const signature = badSignature ? 'assinatura-invalida-de-proposito' : sign(body);
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': signature },
    body,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* corpo vazio ou não-JSON — ok pra alguns testes de erro */
  }
  return { status: res.status, json };
}

let passed = 0;
let failed = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  console.log(`Testando ${URL}\n`);

  // Teste 1 — payload de teste com produto desconhecido: espera 2xx.
  const t1EventId = `test-1-${Date.now()}`;
  const r1 = await post(contractCreatedPayload({ eventId: t1EventId, productId: 'PRODUTO_INEXISTENTE_1' }));
  check('Teste 1 — payload válido responde 2xx', r1.status >= 200 && r1.status < 300, `status ${r1.status}`);

  // Teste 2 — assinatura inválida: espera 401/403.
  const r2 = await post(contractCreatedPayload({ eventId: `test-2-${Date.now()}`, productId: 'PRODUTO_INEXISTENTE_2' }), { badSignature: true });
  check('Teste 2 — assinatura inválida responde 401/403', r2.status === 401 || r2.status === 403, `status ${r2.status}`);

  // Teste 3 — evento duplicado: mesma id duas vezes, ambas 2xx, segunda marcada como duplicata.
  const t3Payload = contractCreatedPayload({ eventId: `test-3-${Date.now()}`, productId: 'PRODUTO_INEXISTENTE_3' });
  const r3a = await post(t3Payload);
  const r3b = await post(t3Payload);
  check('Teste 3 — primeira entrega responde 2xx', r3a.status >= 200 && r3a.status < 300, `status ${r3a.status}`);
  check('Teste 3 — segunda entrega (duplicada) responde 2xx', r3b.status >= 200 && r3b.status < 300, `status ${r3b.status}`);
  check('Teste 3 — segunda entrega é reconhecida como duplicata', r3b.json?.duplicate === true, JSON.stringify(r3b.json));

  // Teste 4 — produto desconhecido: 2xx, e o corpo indica "ignored" (não libera nada).
  const r4 = await post(contractCreatedPayload({ eventId: `test-4-${Date.now()}`, productId: 'PRODUTO_QUE_NUNCA_EXISTIRA' }));
  check('Teste 4 — produto desconhecido responde 2xx', r4.status >= 200 && r4.status < 300, `status ${r4.status}`);
  check('Teste 4 — produto desconhecido não é processado como venda', r4.json?.status === 'ignored', JSON.stringify(r4.json));

  console.log(`\n${passed} passaram, ${failed} falharam.`);
  console.log('\nTeste 5 (compra válida de verdade) não está aqui — precisa de um produto real cadastrado em subscription_products. Ver conversa.');
  process.exit(failed > 0 ? 1 : 0);
}

main();
