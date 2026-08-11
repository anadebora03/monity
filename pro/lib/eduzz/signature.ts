import { createHmac, timingSafeEqual } from 'node:crypto';

/* HMAC-SHA256 do corpo bruto da requisição com EDUZZ_WEBHOOK_SECRET,
   comparado ao cabeçalho x-signature (developers.eduzz.com/docs/webhook/security).
   A documentação confirma o algoritmo (hmac('sha256', chave, corpo)) mas
   não especifica a codificação do valor final (hex vs base64) — hex é o
   padrão mais comum em webhooks (Stripe, GitHub etc.) e o assumido aqui.
   CONFIRMAR no teste real da Eduzz (POST /webhook/v1/subscription/sample,
   item 18 do brief): se a assinatura vier inválida no teste real, trocar
   'hex' por 'base64' abaixo é a única mudança necessária. */
const SIGNATURE_ENCODING: 'hex' | 'base64' = 'hex';

export function verifyEduzzSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.EDUZZ_WEBHOOK_SECRET;
  if (!secret) {
    // Configuração ausente é erro de operação, não de assinatura inválida —
    // mas nunca deve resultar em "aceitar sem validar". Falha fechada.
    console.error('[eduzz webhook] EDUZZ_WEBHOOK_SECRET não configurado');
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest(SIGNATURE_ENCODING);

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
