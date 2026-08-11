/* Tipos espelhando as tabelas de supabase/schema_pro.sql. Nomes de
   coluna em snake_case de propósito (igual ao banco) — sem camada de
   mapeamento camelCase/snake_case nesta sprint, seria complexidade
   sem necessidade real ainda (ver js/database.js do paciente pra
   contraste: lá o mapeamento existe porque o app inteiro já era
   camelCase antes do Supabase chegar; aqui o Pro nasce direto em
   cima do schema). */

export type Profession = {
  id: string;
  slug: string;
  nome: string;
  active: boolean;
};

export type Plan = {
  id: string;
  slug: string;
  nome: string;
  patient_limit: number | null;
  price_cents: number | null;
  included_seats: number | null;
  periodo: 'mensal' | 'semestral' | 'anual';
  features: string[];
  status: 'active' | 'archived' | 'draft';
  destaque: boolean;
  active: boolean;
};

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export type SubscriptionProductType = 'professional' | 'patient';

/* Sprint Assinatura — tabela nasce vazia (schema_pro_025.sql) até
   existir integração de pagamento ou cadastro manual pelo admin; um
   workspace pode legitimamente não ter nenhuma linha aqui ainda.
   Sprint Integração Eduzz (schema_pro_032.sql): workspace_id/plan_id
   viram opcionais e user_id aparece — assinatura de PACIENTE tem
   user_id preenchido e workspace_id/plan_id nulos; assinatura de
   PROFISSIONAL é o inverso. Nunca os dois preenchidos ao mesmo tempo
   (constraint no banco). */
export type Subscription = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  plan_id: string | null;
  subscription_product_id: string | null;
  product_type: SubscriptionProductType;
  status: SubscriptionStatus;
  valor_cents: number | null;
  provider_subscription_id: string | null;
  external_customer_id: string | null;
  current_period_end: string | null;
  ultimo_pagamento_em: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
};

/* Mapeamento external_product_id (Eduzz, ou outro provider futuro) ->
   plano Monity. Sem UI ainda — cadastro manual pelo admin depois que
   os produtos existirem de verdade na Eduzz (schema_pro_032.sql). */
export type SubscriptionProduct = {
  id: string;
  provider: string;
  external_product_id: string;
  product_type: SubscriptionProductType;
  plan_id: string | null;
  patient_product_slug: string | null;
  billing_interval: string | null;
  active: boolean;
};

export type ProfessionalProfile = {
  id: string;
  nome: string | null;
  profession_id: string | null;
  foto_url: string | null;
  crn_crm: string | null;
  especialidade: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  biografia: string | null;
};

export type Workspace = {
  id: string;
  owner_id: string;
  nome: string | null;
  plan_id: string | null;
  patient_limit: number | null;
  status: string;
  requested_plan_id: string | null;
  requested_plan_at: string | null;
};

export type RelationshipStatus = 'invite_sent' | 'pending_acceptance' | 'active' | 'ended';

export type PatientRelationship = {
  id: string;
  workspace_id: string;
  patient_id: string | null;
  invited_by: string;
  code: string | null;
  patient_email: string | null;
  status: RelationshipStatus;
};
