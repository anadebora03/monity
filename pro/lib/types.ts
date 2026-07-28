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
