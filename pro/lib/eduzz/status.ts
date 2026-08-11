import type { EduzzContractStatus } from './types';
import type { SubscriptionStatus } from '@/lib/types';

/* Tradução dos 9 status reais de data.contract.status (Eduzz) pros 4
   que subscriptions.status já suporta (schema_pro_025.sql). Decisão
   de negócio confirmada na Sprint Integração Eduzz — não é 1:1 na
   documentação, a Eduzz tem mais granularidade do que o Monity
   precisa hoje:
   - upToDate/free  -> active     (em dia, nada a fazer)
   - trial          -> trialing
   - awaitingPayment/late/defaulter/suspended -> past_due
     (mesmo princípio já usado com paciente: acesso fica restrito,
     nada é apagado; distinguir os quatro internamente não muda
     nenhuma decisão de produto hoje)
   - canceled/finished -> canceled */
export function mapEduzzContractStatus(status: EduzzContractStatus): SubscriptionStatus {
  switch (status) {
    case 'upToDate':
    case 'free':
      return 'active';
    case 'trial':
      return 'trialing';
    case 'awaitingPayment':
    case 'late':
    case 'defaulter':
    case 'suspended':
      return 'past_due';
    case 'canceled':
    case 'finished':
      return 'canceled';
  }
}
