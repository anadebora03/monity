import type { SupabaseClient } from '@supabase/supabase-js';

export const CATEGORIAS_PLANO = ['Alimentação', 'Atividade Física', 'Aplicação', 'Medicação', 'Hidratação', 'Exames', 'Consulta', 'Hábitos', 'Outro'] as const;
export type CategoriaPlano = (typeof CATEGORIAS_PLANO)[number];
export type PrioridadePlano = 'alta' | 'media' | 'baixa';
export type StatusPlano = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';

export type PlanoTerapeutico = {
  id: string;
  patientId: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  prazo: string | null;
  prioridade: PrioridadePlano;
  permitirConclusaoPaciente: boolean;
  status: StatusPlano;
  createdAt: string;
  concluidoEm: string | null;
};

function fromRow(r: any): PlanoTerapeutico {
  return {
    id: r.id,
    patientId: r.patient_id,
    titulo: r.titulo,
    descricao: r.descricao,
    categoria: r.categoria,
    prazo: r.prazo,
    prioridade: r.prioridade,
    permitirConclusaoPaciente: r.permitir_conclusao_paciente,
    status: r.status,
    createdAt: r.created_at,
    concluidoEm: r.concluido_em,
  };
}

/* Só os planos PERSONALIZADOS (escritos pelo profissional) vivem
   aqui — o Plano Automático (Insights) continua 100% calculado ao
   vivo em patient-detail.ts, nunca gravado nesta tabela. Histórico
   nunca é apagado: cancelar/concluir só muda o status, a linha
   continua existindo pra sempre (pedido explícito da sprint). */
export async function listarPlanosTerapeuticos(supabase: SupabaseClient, patientId: string): Promise<PlanoTerapeutico[]> {
  const { data } = await supabase.from('planos_terapeuticos').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
  return (data ?? []).map(fromRow);
}

export async function criarPlanoTerapeutico(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    professionalId: string;
    patientId: string;
    titulo: string;
    descricao: string | null;
    categoria: string;
    prazo: string | null;
    prioridade: PrioridadePlano;
    permitirConclusaoPaciente: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('planos_terapeuticos').insert({
    workspace_id: params.workspaceId,
    professional_id: params.professionalId,
    patient_id: params.patientId,
    titulo: params.titulo,
    descricao: params.descricao,
    categoria: params.categoria,
    prazo: params.prazo,
    prioridade: params.prioridade,
    permitir_conclusao_paciente: params.permitirConclusaoPaciente,
  });
  if (error) return { ok: false, error: 'Não foi possível salvar a orientação. Tente novamente.' };
  return { ok: true };
}

export async function atualizarStatusPlano(supabase: SupabaseClient, id: string, status: StatusPlano) {
  const patch: Record<string, unknown> = { status };
  if (status === 'concluido') patch.concluido_em = new Date().toISOString();
  await supabase.from('planos_terapeuticos').update(patch).eq('id', id);
}

/* Taxa de adesão = concluídos ÷ (tudo que já teve chance de ser
   concluído). Cancelados ficam fora do denominador — cancelar é uma
   decisão do profissional/contexto, não uma falha de adesão do
   paciente. */
export function calcularAdesao(planos: PlanoTerapeutico[]): number | null {
  const validos = planos.filter((p) => p.status !== 'cancelado');
  if (validos.length === 0) return null;
  const concluidos = validos.filter((p) => p.status === 'concluido').length;
  return Math.round((concluidos / validos.length) * 100);
}

export type StatsPacientePlano = { ativos: number; concluidos: number; adesao: number | null };
export function statsPacientePlano(planos: PlanoTerapeutico[]): StatsPacientePlano {
  return {
    ativos: planos.filter((p) => p.status === 'pendente' || p.status === 'em_andamento').length,
    concluidos: planos.filter((p) => p.status === 'concluido').length,
    adesao: calcularAdesao(planos),
  };
}

export type StatsWorkspacePlano = { pendentes: number; concluidos: number; emAtraso: number };

/* Card do Dashboard (Sprint 022) — três consultas pequenas e
   diretas, não uma leitura de todos os planos do workspace pra
   contar em JS (evita trazer histórico inteiro só pra um número). */
export async function getPlanoStatsWorkspace(supabase: SupabaseClient): Promise<StatsWorkspacePlano> {
  const hoje = new Date().toISOString().slice(0, 10);
  const [{ count: pendentes }, { count: concluidos }, { count: emAtraso }] = await Promise.all([
    supabase.from('planos_terapeuticos').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'em_andamento']),
    supabase.from('planos_terapeuticos').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
    supabase.from('planos_terapeuticos').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'em_andamento']).lt('prazo', hoje),
  ]);
  return { pendentes: pendentes ?? 0, concluidos: concluidos ?? 0, emAtraso: emAtraso ?? 0 };
}

/* "Criar a partir de modelo" (diferencial competitivo pedido na
   sprint) — nesta fase são só sugestões de conteúdo pra preencher o
   formulário mais rápido, guardadas como constante (não uma tabela:
   não há nada dinâmico/editável neles ainda — "preparar a
   estrutura" vira uma tabela de verdade quando os modelos puderem
   ser criados/editados pelo profissional, fora do escopo desta
   sprint). */
export type ModeloPlano = { nome: string; titulo: string; descricao: string; categoria: CategoriaPlano };
export const MODELOS_PLANO: ModeloPlano[] = [
  { nome: 'Primeiros 30 dias de GLP-1', titulo: 'Adaptação aos primeiros 30 dias', descricao: 'Priorize refeições leves e fracionadas, hidrate-se bem e evite frituras enquanto o corpo se adapta ao medicamento.', categoria: 'Hábitos' },
  { nome: 'Constipação', titulo: 'Manejo da constipação', descricao: 'Aumente a ingestão de fibras e água, e caminhe pelo menos 20 minutos por dia.', categoria: 'Alimentação' },
  { nome: 'Náuseas', titulo: 'Redução de náuseas', descricao: 'Prefira refeições pequenas e frequentes, evite deitar logo após comer e reduza alimentos gordurosos.', categoria: 'Alimentação' },
  { nome: 'Baixa ingestão de proteínas', titulo: 'Aumentar ingestão proteica', descricao: 'Inclua uma fonte de proteína em cada refeição principal — ovos, carnes magras, iogurte ou leguminosas.', categoria: 'Alimentação' },
  { nome: 'Baixa ingestão hídrica', titulo: 'Aumentar consumo de água', descricao: 'Meta de pelo menos 2 litros de água por dia — usar um lembrete ao longo do dia pode ajudar.', categoria: 'Hidratação' },
  { nome: 'Sedentarismo', titulo: 'Retomar atividade física', descricao: 'Caminhar 30 minutos, 5 vezes por semana, como ponto de partida.', categoria: 'Atividade Física' },
  { nome: 'Reeducação alimentar', titulo: 'Reeducação alimentar gradual', descricao: 'Reduzir ultraprocessados e priorizar alimentos naturais nas próximas semanas, com acompanhamento nas consultas.', categoria: 'Alimentação' },
];
