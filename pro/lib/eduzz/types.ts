/* Tipos espelhando os payloads REAIS documentados em
   developers.eduzz.com/reference/webhook/myeduzz-* (consultados na
   Sprint Integração Eduzz — não inventados). Só os campos que o
   Monity de fato usa estão tipados; o payload completo sempre vai
   inteiro pra `eduzz_webhook_events.payload` (jsonb), então nada se
   perde por não estar aqui. */

export type EduzzWebhookEnvelope<T = unknown> = {
  id: string;
  event: string;
  data: T;
  sentDate: string;
};

/* data.contract.status — os 9 valores reais documentados. Ver
   pro/lib/eduzz/status.ts pra tradução pros 4 status internos do
   Monity (subscriptions.status). */
export type EduzzContractStatus = 'upToDate' | 'awaitingPayment' | 'late' | 'canceled' | 'defaulter' | 'suspended' | 'trial' | 'finished' | 'free';

export type EduzzContractUpdateReason =
  | 'status_updated'
  | 'negotiation'
  | 'readjustment'
  | 'upgrade'
  | 'downgrade'
  | 'reactivation'
  | 'suspension'
  | 'cancellation';

type EduzzMoney = { currency: string; value: number };
type EduzzPhone = { countryCode: string; areaCode: string; number: string };
type EduzzPerson = { name: string; email: string; phone?: EduzzPhone };

type EduzzContract = {
  id: string;
  payment: { method: string; totalOfInstallments?: number; installments?: number };
  status: EduzzContractStatus;
  trialDays?: number;
  createdAt: string;
  updatedAt: string;
  recurrence?: {
    startsAt: string;
    nextDue: string;
    currentDue: string;
    lastDue: string;
    finishesAt: string;
    frequency: { type: string; value: number };
    price: EduzzMoney;
  };
};

type EduzzProductRef = { id: string; name: string; price: EduzzMoney };

/* myeduzz.contract_created / myeduzz.contract_updated —
   reference/webhook/myeduzz-contract-created e -contract-updated */
export type EduzzContractEventData = {
  producer: { id: string; name: string; email: string };
  products: EduzzProductRef[];
  contract: EduzzContract;
  customer: EduzzPerson;
  financialResponsible?: EduzzPerson;
  reason?: EduzzContractUpdateReason; // só em contract_updated
};

/* myeduzz.invoice_paid — reference/webhook/myeduzz-invoice-paid */
export type EduzzInvoicePaidEventData = {
  id: string;
  status: string;
  buyer: { id: string; name: string; email: string };
  producer: { id: string; name: string; email: string };
  price: EduzzMoney;
  paid: EduzzMoney;
  paidAt: string;
  dueDate: string;
  contract: { id: string; isUnlimitedInstallments: boolean };
  items: { productId: string; name: string; price: EduzzMoney }[];
  paymentMethod: string;
};

/* myeduzz.contract_card_attempted —
   reference/webhook/myeduzz-contract-card-attempted. Dispara pra
   tentativa com sucesso OU falha — invoice.status/failReason
   distinguem. */
export type EduzzCardAttemptedEventData = {
  producer: { id: string; name: string; email: string };
  invoice: {
    id: string;
    payment: { method: string; installments: number };
    isNegotiation: boolean;
    failReason: string | null;
    failReasonMessage: string | null;
    status: string;
    dueDate: string;
    attemptDate: string;
  };
  contract: { id: string; status: EduzzContractStatus; createdAt: string; updatedAt: string };
  customer: { id: string; name: string; email: string };
};
