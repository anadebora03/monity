/* ============================================================
   COMPASSO · Plano Terapêutico do profissional (Sprint 022)
   Diferente de todo o resto do app (local-first, sincroniza depois),
   esta é a PRIMEIRA fonte de dado que o app do paciente lê direto
   do Supabase, sem passar por `S`/js/database.js — porque não é
   dado do paciente, é dado que o PROFISSIONAL escreve pra ele. Só
   leitura + uma única ação (concluir), nunca criação/edição daqui.
   Sem fila offline: se não tiver rede, a lista de orientações do
   profissional simplesmente não aparece agora (o resto do app
   continua 100% funcional — mesmo princípio "melhor esforço" já
   usado pra sincronização, Sprint J).
   ============================================================ */
import { supabase } from './supabase.js';

function fromRow(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao,
    categoria: r.categoria,
    prazo: r.prazo,
    prioridade: r.prioridade,
    permitirConclusao: r.permitir_conclusao_paciente,
    status: r.status,
    criadoEm: r.created_at,
    concluidoEm: r.concluido_em,
  };
}

/* RLS (schema_pro_022.sql) já restringe a leitura só às linhas onde
   patient_id = auth.uid() — não precisa filtrar aqui de novo. */
async function listarPlanosProfissional() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('planos_terapeuticos')
      .select('id, titulo, descricao, categoria, prazo, prioridade, permitir_conclusao_paciente, status, created_at, concluido_em')
      .order('created_at', { ascending: false });
    if (error) { console.error('[PlanoTerapeutico] erro ao listar:', error); return []; }
    return (data || []).map(fromRow);
  } catch (e) {
    console.error('[PlanoTerapeutico] erro ao listar:', e);
    return [];
  }
}

/* Único jeito do paciente concluir — passa pela função SECURITY
   DEFINER concluir_plano_terapeutico() (checa permitir_conclusao_
   paciente no servidor, não confia só na UI escondendo o botão). */
async function concluirPlano(id) {
  if (!supabase) return { ok: false, error: 'Sem conexão com o servidor agora.' };
  try {
    const { error } = await supabase.rpc('concluir_plano_terapeutico', { p_plano_id: id });
    if (error) return { ok: false, error: 'Não foi possível concluir agora. Tente novamente.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Não foi possível concluir agora. Tente novamente.' };
  }
}

const planoTerapeuticoApi = { listarPlanosProfissional, concluirPlano };
if (window.__resolvePlanoTerapeuticoReady) window.__resolvePlanoTerapeuticoReady(planoTerapeuticoApi);
else window.__planoTerapeuticoReady = Promise.resolve(planoTerapeuticoApi);
