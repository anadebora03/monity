import type { SupabaseClient } from '@supabase/supabase-js';
import { todayISO, diasEntre } from './dashboard';

/* ============================================================
   ClinicalPriorityEngine (Sprint 026)
   Motor NOVO, independente do Clinical Intelligence Engine
   (pro/lib/clinical-intelligence.ts). Aquele responde "o que está
   acontecendo com ESTE paciente" (análise profunda, uma pessoa por
   vez). Este responde "quem, entre TODOS os meus pacientes, eu
   preciso olhar hoje" — é um motor de triagem, não de diagnóstico.

   Regra de performance que molda toda a arquitetura deste arquivo:
   nunca uma query por paciente. Todas as buscas abaixo são
   ".in(id, [todos os pacientes do workspace])" — um conjunto FIXO de
   ~8 consultas, custo constante independente de ter 1 ou 200
   pacientes vinculados. Nenhuma tabela ou view nova foi criada (fora
   de escopo desta sprint) — tudo já existe e já é lido hoje por RLS
   "select_pro" (schema_pro.sql).

   "Recalcular só quem foi afetado" (pedido do brief) é resolvido por
   construção, não por cache: como nada aqui é armazenado (mesmo
   princípio "recalcula, nunca guarda" de todo motor deste projeto),
   não existe estado velho pra invalidar seletivamente — cada chamada
   já reflete o dado atual de quem foi pedido (workspace inteiro, ou
   1 paciente só, via calcularPrioridadePaciente). O card do Dashboard
   soma no máximo ~8 queries fixas; abrir 1 paciente soma as mesmas
   ~8 queries só que filtradas pra 1 id — nunca "toda a base".
   ============================================================ */

export type NivelPrioridade = 'excelente' | 'atencao' | 'importante' | 'alta';

export type CategoriaFator = 'atualizacao' | 'peso' | 'aplicacoes' | 'sintomas' | 'agua' | 'proteina' | 'bioimpedancia' | 'exames' | 'agenda' | 'plano_terapeutico';

export type FatorPrioridade = { categoria: CategoriaFator; motivo: string; pontos: number };

export type PrioridadePaciente = {
  patientId: string;
  nome: string;
  ultimoRegistro: string | null;
  score: number; // 0-100, uso interno — a tela mostra só o nível
  nivel: NivelPrioridade;
  fatores: FatorPrioridade[];
};

export const NIVEL_LABEL: Record<NivelPrioridade, string> = { excelente: 'Excelente', atencao: 'Atenção', importante: 'Importante', alta: 'Prioridade Alta' };

function nivelDoScore(score: number): NivelPrioridade {
  if (score <= 20) return 'excelente';
  if (score <= 40) return 'atencao';
  if (score <= 60) return 'importante';
  return 'alta';
}

function nf(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function fmtBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function media(ns: number[]): number | null {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
}
function isoBack(dias: number, hoje: string): string {
  const d = new Date(hoje + 'T00:00:00');
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

/* ---------- sinais crus de um paciente — o que o motor precisa pra pontuar ---------- */
type Sinais = {
  patientId: string;
  nome: string;
  dataInicio: string | null;
  ultimoRegistro: string | null;
  metaAgua: number | null;
  metaProteina: number | null;
  pesagens: { date: string; peso: number }[]; // últimos ~90 dias
  aplicacoes: { date: string }[]; // últimos ~90 dias
  ultimaAplicacao: string | null; // pode ser anterior à janela de 90 dias
  dailyLogs: { date: string; agua: number | null; proteina: number | null; sintomas: string[] }[]; // últimos ~30 dias
  bio: { date: string; gordura: number | null; massaMagraPct: number | null }[];
  ultimoExame: string | null;
  retornoVencido: boolean;
  ultimaConsultaCancelada: boolean;
  planos: { status: string; prazo: string | null }[];
};

/* ---------- regras de pontuação (aditivas, score final capado em 100) ----------
   Números calibrados a olho, documentados, ajustáveis — mesmo
   espírito dos limiares já usados em clinical-intelligence.ts
   (reaproveito os mesmos limiares quando é o mesmo conceito clínico,
   pra não fazer os dois motores discordarem sobre o que é "grave"). */
function calcularFatores(s: Sinais, hoje: string): FatorPrioridade[] {
  const fatores: FatorPrioridade[] = [];

  // ---------- atualização ----------
  if (s.ultimoRegistro) {
    const dias = diasEntre(s.ultimoRegistro, hoje);
    if (dias > 30) fatores.push({ categoria: 'atualizacao', motivo: `Sem registrar nada há ${dias} dias.`, pontos: 35 });
    else if (dias > 21) fatores.push({ categoria: 'atualizacao', motivo: `Sem registrar nada há ${dias} dias.`, pontos: 25 });
    else if (dias > 10) fatores.push({ categoria: 'atualizacao', motivo: `Sem registrar nada há ${dias} dias.`, pontos: 15 });
  } else if (s.dataInicio && diasEntre(s.dataInicio, hoje) > 3) {
    fatores.push({ categoria: 'atualizacao', motivo: 'Nenhum registro desde o início do tratamento.', pontos: 25 });
  }

  // ---------- peso ----------
  const recentes21 = s.pesagens.filter((p) => diasEntre(p.date, hoje) <= 21);
  if (recentes21.length >= 3) {
    const pesos = recentes21.map((p) => p.peso);
    if (Math.max(...pesos) - Math.min(...pesos) < 0.3) {
      fatores.push({ categoria: 'peso', motivo: `Peso estabilizado nas últimas ${recentes21.length} pesagens.`, pontos: 10 });
    }
  }
  if (s.pesagens.length >= 1) {
    const atual = s.pesagens[s.pesagens.length - 1];
    const referencia = [...s.pesagens].reverse().find((p) => diasEntre(p.date, atual.date) >= 25);
    if (referencia) {
      const delta = +(atual.peso - referencia.peso).toFixed(1);
      if (delta >= 2) fatores.push({ categoria: 'peso', motivo: `Ganho de ${nf(delta)} kg desde ${fmtBR(referencia.date)}.`, pontos: 25 });
      else if (delta >= 1) fatores.push({ categoria: 'peso', motivo: `Ganho de ${nf(delta)} kg desde ${fmtBR(referencia.date)}.`, pontos: 15 });
    }
  } else if (s.dataInicio && diasEntre(s.dataInicio, hoje) > 14) {
    fatores.push({ categoria: 'peso', motivo: 'Nenhuma pesagem registrada até agora.', pontos: 15 });
  }

  // ---------- aplicações ----------
  if (s.ultimaAplicacao) {
    const dias = diasEntre(s.ultimaAplicacao, hoje);
    if (dias > 21) fatores.push({ categoria: 'aplicacoes', motivo: `Sem aplicar há ${dias} dias.`, pontos: 30 });
    else if (dias > 10) fatores.push({ categoria: 'aplicacoes', motivo: `Aplicação atrasada há ${dias} dias.`, pontos: 20 });
  } else if (s.dataInicio && diasEntre(s.dataInicio, hoje) > 14) {
    fatores.push({ categoria: 'aplicacoes', motivo: 'Nenhuma aplicação registrada até agora.', pontos: 30 });
  }
  if (s.dataInicio) {
    const semanasTotal = Math.min(8, Math.floor(diasEntre(s.dataInicio, hoje) / 7) + 1);
    if (semanasTotal >= 3) {
      const inicioJanela = Math.max(0, Math.floor(diasEntre(s.dataInicio, hoje) / 7) - 8 + 1);
      const semanasComApp = new Set<number>();
      s.aplicacoes.forEach((a) => {
        const idx = Math.floor(diasEntre(s.dataInicio as string, a.date) / 7);
        if (idx >= inicioJanela) semanasComApp.add(idx);
      });
      const pct = Math.round((semanasComApp.size / semanasTotal) * 100);
      if (!isNaN(pct) && pct < 80) fatores.push({ categoria: 'aplicacoes', motivo: `Aplicações em apenas ${pct}% das últimas semanas.`, pontos: 15 });
    }
  }

  // ---------- sintomas ----------
  const comSintoma = s.dailyLogs.filter((l) => l.sintomas.length > 0).slice(-5);
  if (comSintoma.length >= 3) {
    const contagem = new Map<string, number>();
    comSintoma.forEach((l) => l.sintomas.forEach((sn) => contagem.set(sn, (contagem.get(sn) ?? 0) + 1)));
    const [sintoma, vezes] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    if (sintoma && vezes >= 3) {
      const pontos = vezes >= 4 ? 25 : 15;
      fatores.push({ categoria: 'sintomas', motivo: `"${sintoma}" em ${vezes} dos últimos ${comSintoma.length} registros de sintomas.`, pontos });
    }
  }

  // ---------- água / proteína ----------
  const comAgua = s.dailyLogs.filter((l) => diasEntre(l.date, hoje) <= 14 && l.agua != null);
  if (s.metaAgua != null && comAgua.length >= 5) {
    const abaixo = comAgua.filter((l) => (l.agua as number) < (s.metaAgua as number)).length;
    if (Math.round((abaixo / comAgua.length) * 100) >= 60) fatores.push({ categoria: 'agua', motivo: 'Consumo de água abaixo da meta na maioria dos últimos dias.', pontos: 10 });
  }
  const comProt = s.dailyLogs.filter((l) => diasEntre(l.date, hoje) <= 14 && l.proteina != null);
  if (s.metaProteina != null && comProt.length >= 5) {
    const abaixo = comProt.filter((l) => (l.proteina as number) < (s.metaProteina as number)).length;
    if (Math.round((abaixo / comProt.length) * 100) >= 60) fatores.push({ categoria: 'proteina', motivo: 'Ingestão de proteína abaixo da meta na maioria dos últimos dias.', pontos: 10 });
  }

  // ---------- bioimpedância ----------
  const bioComGordura = s.bio.filter((b) => b.gordura != null);
  if (bioComGordura.length >= 2 && s.pesagens.length >= 2) {
    const bioIni = bioComGordura[0];
    const bioFim = bioComGordura[bioComGordura.length - 1];
    const pesoIni = [...s.pesagens].reverse().find((p) => p.date <= bioIni.date) ?? s.pesagens[0];
    const pesoFim = [...s.pesagens].reverse().find((p) => p.date <= bioFim.date) ?? s.pesagens[s.pesagens.length - 1];
    const deltaPeso = pesoFim.peso - pesoIni.peso;
    const deltaGordura = (bioFim.gordura as number) - (bioIni.gordura as number);
    if (deltaPeso <= -1 && deltaGordura >= 0) fatores.push({ categoria: 'bioimpedancia', motivo: 'Peso caiu, mas o percentual de gordura não acompanhou — possível perda de massa magra.', pontos: 20 });
  }

  // ---------- exames ----------
  if (s.ultimoExame) {
    const dias = diasEntre(s.ultimoExame, hoje);
    if (dias > 180) fatores.push({ categoria: 'exames', motivo: `Último exame há ${dias} dias.`, pontos: 10 });
  } else if (s.dataInicio && diasEntre(s.dataInicio, hoje) > 60) {
    fatores.push({ categoria: 'exames', motivo: 'Nenhum exame registrado até agora.', pontos: 10 });
  }

  // ---------- agenda ----------
  if (s.retornoVencido) fatores.push({ categoria: 'agenda', motivo: 'Retorno agendado já venceu sem confirmação de realização.', pontos: 20 });
  if (s.ultimaConsultaCancelada) fatores.push({ categoria: 'agenda', motivo: 'Última consulta foi cancelada e ainda não foi reagendada.', pontos: 15 });

  // ---------- plano terapêutico ----------
  const planosValidos = s.planos.filter((p) => p.status !== 'cancelado');
  if (planosValidos.length >= 2) {
    const concluidos = planosValidos.filter((p) => p.status === 'concluido').length;
    const adesao = Math.round((concluidos / planosValidos.length) * 100);
    if (adesao < 50) fatores.push({ categoria: 'plano_terapeutico', motivo: `Taxa de adesão ao plano terapêutico de apenas ${adesao}%.`, pontos: 15 });
  }
  const vencidos = s.planos.filter((p) => p.prazo && p.prazo < hoje && (p.status === 'pendente' || p.status === 'em_andamento')).length;
  if (vencidos > 0) fatores.push({ categoria: 'plano_terapeutico', motivo: `${vencidos} orientação${vencidos > 1 ? 'ões' : ''} do plano terapêutico com prazo vencido.`, pontos: 15 });

  return fatores.sort((a, b) => b.pontos - a.pontos);
}

function montarPrioridade(s: Sinais, hoje: string): PrioridadePaciente {
  const fatores = calcularFatores(s, hoje);
  const score = Math.min(100, fatores.reduce((sum, f) => sum + f.pontos, 0));
  return { patientId: s.patientId, nome: s.nome, ultimoRegistro: s.ultimoRegistro, score, nivel: nivelDoScore(score), fatores };
}

/* ---------- busca em lote (custo fixo, nunca 1 query por paciente) ---------- */
export async function calcularPrioridadesWorkspace(supabase: SupabaseClient, apenasPacientes?: string[]): Promise<PrioridadePaciente[]> {
  const hoje = todayISO();

  let summaryQuery = supabase
    .from('workspace_patient_summary')
    .select('patient_id, nome, data_inicio, ultimo_registro');
  if (apenasPacientes?.length) summaryQuery = summaryQuery.in('patient_id', apenasPacientes);
  const { data: summary } = await summaryQuery;

  const linhas = summary ?? [];
  if (!linhas.length) return [];
  const ids = linhas.map((r) => r.patient_id as string);
  const desde90 = isoBack(90, hoje);
  const desde30 = isoBack(30, hoje);

  const [{ data: pesagens }, { data: aplicacoesRecentes }, { data: ultimaAplicacaoRows }, { data: logs }, { data: bio }, { data: exames }, { data: retornos }, { data: planos }, { data: perfis }] = await Promise.all([
    supabase.from('weighings').select('user_id, date, peso').in('user_id', ids).gte('date', desde90).order('date', { ascending: true }),
    supabase.from('applications').select('user_id, date').in('user_id', ids).gte('date', desde90).order('date', { ascending: true }),
    supabase.from('applications').select('user_id, date').in('user_id', ids).order('date', { ascending: false }),
    supabase.from('daily_logs').select('user_id, date, agua, proteina, sintomas').in('user_id', ids).gte('date', desde30).order('date', { ascending: true }),
    supabase.from('bioimpedance').select('user_id, date, gordura, massa_magra').in('user_id', ids).order('date', { ascending: true }),
    supabase.from('exams').select('user_id, date').in('user_id', ids).order('date', { ascending: false }),
    supabase.from('compromissos').select('patient_id, data, tipo, status').in('patient_id', ids).order('data', { ascending: false }),
    supabase.from('planos_terapeuticos').select('patient_id, status, prazo').in('patient_id', ids),
    supabase.from('profiles').select('id, meta_agua, meta_proteina').in('id', ids),
  ]);

  // última aplicação por paciente (1ª linha de cada grupo, já ordenado desc)
  const ultimaAplicacaoPorId = new Map<string, string>();
  (ultimaAplicacaoRows ?? []).forEach((r) => { if (!ultimaAplicacaoPorId.has(r.user_id)) ultimaAplicacaoPorId.set(r.user_id, r.date); });

  // último exame por paciente
  const ultimoExamePorId = new Map<string, string>();
  (exames ?? []).forEach((r) => { if (!ultimoExamePorId.has(r.user_id)) ultimoExamePorId.set(r.user_id, r.date); });

  // retorno vencido / última consulta cancelada — a partir da lista já ordenada por data desc
  const retornoVencidoPorId = new Set<string>();
  const ultimaCanceladaPorId = new Set<string>();
  const primeiraLinhaVista = new Set<string>();
  (retornos ?? []).forEach((r) => {
    if (r.tipo === 'Retorno' && r.data < hoje && r.status !== 'realizado' && r.status !== 'cancelado') retornoVencidoPorId.add(r.patient_id);
    if (!primeiraLinhaVista.has(r.patient_id)) {
      primeiraLinhaVista.add(r.patient_id);
      if (r.status === 'cancelado') ultimaCanceladaPorId.add(r.patient_id);
    }
  });

  const metaPorId = new Map((perfis ?? []).map((p) => [p.id, { agua: p.meta_agua as number | null, proteina: p.meta_proteina as number | null }]));

  function agruparPor<T extends Record<string, unknown>>(arr: T[] | null, chave: keyof T): Map<string, T[]> {
    const mapa = new Map<string, T[]>();
    (arr ?? []).forEach((row) => {
      const id = row[chave] as string;
      const lista = mapa.get(id);
      if (lista) lista.push(row);
      else mapa.set(id, [row]);
    });
    return mapa;
  }
  const pesagensPorId = agruparPor(pesagens, 'user_id');
  const aplicacoesPorId = agruparPor(aplicacoesRecentes, 'user_id');
  const logsPorId = agruparPor(logs, 'user_id');
  const bioPorId = agruparPor(bio, 'user_id');
  const planosPorId = agruparPor(planos, 'patient_id');

  return linhas.map((r) => {
    const id = r.patient_id as string;
    const meta = metaPorId.get(id);
    const sinais: Sinais = {
      patientId: id,
      nome: r.nome || 'Paciente',
      dataInicio: r.data_inicio,
      ultimoRegistro: r.ultimo_registro ? String(r.ultimo_registro).slice(0, 10) : null,
      metaAgua: meta?.agua ?? null,
      metaProteina: meta?.proteina ?? null,
      pesagens: (pesagensPorId.get(id) ?? []).map((p) => ({ date: p.date as string, peso: p.peso as number })),
      aplicacoes: (aplicacoesPorId.get(id) ?? []).map((a) => ({ date: a.date as string })),
      ultimaAplicacao: ultimaAplicacaoPorId.get(id) ?? null,
      dailyLogs: (logsPorId.get(id) ?? []).map((l) => ({
        date: l.date as string,
        agua: l.agua as number | null,
        proteina: l.proteina as number | null,
        sintomas: ((l.sintomas as string[] | null) ?? []).filter((s) => s !== 'Sem sintomas'),
      })),
      bio: (bioPorId.get(id) ?? []).map((b) => ({ date: b.date as string, gordura: b.gordura as number | null, massaMagraPct: b.massa_magra as number | null })),
      ultimoExame: ultimoExamePorId.get(id) ?? null,
      retornoVencido: retornoVencidoPorId.has(id),
      ultimaConsultaCancelada: ultimaCanceladaPorId.has(id),
      planos: (planosPorId.get(id) ?? []).map((p) => ({ status: p.status as string, prazo: p.prazo as string | null })),
    };
    return montarPrioridade(sinais, hoje);
  });
}

export async function calcularPrioridadePaciente(supabase: SupabaseClient, patientId: string): Promise<PrioridadePaciente | null> {
  const r = await calcularPrioridadesWorkspace(supabase, [patientId]);
  return r[0] ?? null;
}
