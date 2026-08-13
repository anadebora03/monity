import type { SupabaseClient } from '@supabase/supabase-js';
import { todayISO, diasEntre } from './dashboard';

/* ============================================================
   Clinical Intelligence Engine (Sprint 023)
   Motor NOVO e independente do motor de Insights do paciente
   (js/insights.js) — não importa nada de lá, não escreve nada lá.
   Só lê dado que o profissional já enxerga hoje via RLS "select_pro"
   (schema_pro.sql) — nenhuma tabela nova, nenhuma permissão nova.

   Regra de ouro: toda conclusão carrega `evidencia` (datas/valores
   reais usados) — nunca uma frase sem lastro nos dados. Nenhuma IA
   generativa, nenhuma prescrição — só regras determinísticas sobre
   os dados já registrados.
   ============================================================ */

export type NivelInsight = 'informativo' | 'atencao' | 'importante' | 'prioritario';

export type AlertaClinico = {
  id: string;
  nivel: NivelInsight;
  titulo: string;
  explicacao: string;
  causaProvavel: string;
  sugestaoAcompanhamento: string;
  evidencia: string[];
};

export type Tendencia = {
  metrica: 'peso' | 'imc' | 'gordura' | 'massaMuscular' | 'agua';
  label: string;
  direcao: 'caindo' | 'subindo' | 'estavel' | 'oscilando';
  texto: string;
  evidencia: string[];
};

export type Correlacao = { id: string; texto: string; evidencia: string[] };

export type DestaqueTimeline = { evento: string; consequencia: string; evidencia: string[] };

export type EvolucaoGeral = {
  adesao: number | null;
  aplicacoes: number | null;
  pesagens: number | null;
  proteina: number | null;
  agua: number | null;
  sintomasNivel: 'baixa' | 'media' | 'alta' | null;
};

export type PeriodoComparacao = '7d' | '30d' | '90d' | 'tudo';

export type AssistenteClinico = {
  temDados: boolean;
  resumo: string;
  alertas: AlertaClinico[];
  evolucaoGeral: EvolucaoGeral;
  tendencias: Tendencia[];
  correlacoes: Correlacao[];
  timelineDestaques: DestaqueTimeline[];
  geradoEm: string;
};

export type PesagemC = { date: string; peso: number };
export type AplicacaoC = { date: string; medicamento: string | null };
export type BioC = { date: string; gordura: number | null; massaMagraPct: number | null };
export type DailyLogC = { date: string; agua: number | null; proteina: number | null; sintomas: string[]; exercicios: string[] };

export type DadosClinicos = {
  temPerfil: boolean;
  pesoInicial: number | null;
  pesoMeta: number | null;
  altura: number | null;
  dataInicio: string | null;
  metaAgua: number | null;
  metaProteina: number | null;
  pesagens: PesagemC[];
  aplicacoes: AplicacaoC[];
  bio: BioC[];
  dailyLogs: DailyLogC[];
};

/* ---------- busca (server-side, RLS select_pro cuida do escopo) ---------- */
export async function buscarDadosClinicos(supabase: SupabaseClient, patientId: string): Promise<DadosClinicos> {
  const [{ data: profile }, { data: weighings }, { data: applications }, { data: bio }, { data: dailyLogs }] = await Promise.all([
    supabase.from('profiles').select('peso_inicial, peso_meta, altura, data_inicio, meta_agua, meta_proteina').eq('id', patientId).maybeSingle(),
    supabase.from('weighings').select('date, peso').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('applications').select('date, medicamento').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('bioimpedance').select('date, gordura, massa_magra').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('daily_logs').select('date, agua, proteina, sintomas, exercicios').eq('user_id', patientId).order('date', { ascending: true }),
  ]);

  return {
    temPerfil: !!profile,
    pesoInicial: profile?.peso_inicial ?? null,
    pesoMeta: profile?.peso_meta ?? null,
    altura: profile?.altura ?? null,
    dataInicio: profile?.data_inicio ?? null,
    metaAgua: profile?.meta_agua ?? null,
    metaProteina: profile?.meta_proteina ?? null,
    pesagens: (weighings ?? []).map((w) => ({ date: w.date, peso: w.peso })),
    aplicacoes: (applications ?? []) as AplicacaoC[],
    bio: (bio ?? []).map((b) => ({ date: b.date, gordura: b.gordura, massaMagraPct: b.massa_magra })),
    dailyLogs: (dailyLogs ?? []).map((l) => ({
      date: l.date,
      agua: l.agua,
      proteina: l.proteina,
      sintomas: ((l.sintomas as string[] | null) ?? []).filter((s) => s !== 'Sem sintomas'),
      exercicios: (l.exercicios as string[] | null) ?? [],
    })),
  };
}

/* ---------- helpers puros ---------- */
function nf(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function fmtBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function dentroPeriodo<T extends { date: string }>(itens: T[], ini: string, fim: string): T[] {
  return itens.filter((i) => i.date >= ini && i.date <= fim);
}
function periodoRange(periodo: PeriodoComparacao, dataInicio: string | null, hoje: string): { ini: string; fim: string } {
  const back = (dias: number) => {
    const d = new Date(hoje + 'T00:00:00');
    d.setDate(d.getDate() - dias);
    return d.toISOString().slice(0, 10);
  };
  if (periodo === '7d') return { ini: back(6), fim: hoje };
  if (periodo === '30d') return { ini: back(29), fim: hoje };
  if (periodo === '90d') return { ini: back(89), fim: hoje };
  return { ini: dataInicio || back(365 * 5), fim: hoje };
}
function media(ns: number[]): number | null {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
}
function desvioPadrao(ns: number[]): number | null {
  if (ns.length < 2) return null;
  const m = media(ns)!;
  return Math.sqrt(ns.reduce((s, n) => s + (n - m) ** 2, 0) / ns.length);
}

/* % de dias (com registro) em que um campo do diário ficou dentro/fora da meta,
   numa janela de N dias terminando hoje. null quando não há dias registrados
   suficientes na janela — regra "sem dado, sem alerta", nunca inventar. */
function percentualDiarioAbaixoDaMeta(logs: DailyLogC[], campo: 'agua' | 'proteina', meta: number | null, hoje: string, janelaDias = 14, minDias = 5): number | null {
  if (meta == null) return null;
  const corte = new Date(hoje + 'T00:00:00');
  corte.setDate(corte.getDate() - janelaDias);
  const corteISO = corte.toISOString().slice(0, 10);
  const comRegistro = logs.filter((l) => l.date >= corteISO && l.date <= hoje && l[campo] != null);
  if (comRegistro.length < minDias) return null;
  const abaixo = comRegistro.filter((l) => (l[campo] as number) < meta).length;
  return Math.round((abaixo / comRegistro.length) * 100);
}

/* % de semanas (desde o início do tratamento, até no máx. `janelaSemanas`)
   em que existe ao menos um registro de `datas`. Mesmo princípio de
   adesão já usado no Dashboard (Sprint 017) e no app do paciente. */
function adesaoSemanal(datas: string[], dataInicio: string | null, hoje: string, janelaSemanas = 8): number | null {
  if (!dataInicio) return null;
  const semanasDesdeInicio = Math.floor(diasEntre(dataInicio, hoje) / 7);
  const semanasTotal = Math.min(janelaSemanas, semanasDesdeInicio + 1);
  if (semanasTotal < 3) return null; // dado insuficiente pra uma leitura de adesão que faça sentido
  const inicioJanela = Math.max(0, semanasDesdeInicio - janelaSemanas + 1);
  const semanasComRegistro = new Set<number>();
  datas.forEach((d) => {
    const idx = Math.floor(diasEntre(dataInicio, d) / 7);
    if (idx >= inicioJanela) semanasComRegistro.add(idx);
  });
  return Math.round((semanasComRegistro.size / semanasTotal) * 100);
}

/* ---------- Evolução Geral ---------- */
function calcularEvolucaoGeral(d: DadosClinicos, pesagensP: PesagemC[], aplicacoesP: AplicacaoC[], logsP: DailyLogC[], hoje: string): EvolucaoGeral {
  const aplicacoesPct = adesaoSemanal(aplicacoesP.map((a) => a.date), d.dataInicio, hoje);
  const pesagensPct = adesaoSemanal(pesagensP.map((p) => p.date), d.dataInicio, hoje);
  const proteinaPctAbaixo = percentualDiarioAbaixoDaMeta(logsP, 'proteina', d.metaProteina, hoje);
  const aguaPctAbaixo = percentualDiarioAbaixoDaMeta(logsP, 'agua', d.metaAgua, hoje);

  const partes = [aplicacoesPct, pesagensPct].filter((n): n is number => n != null);
  const adesao = partes.length ? Math.round(media(partes)!) : null;

  const recentes = logsP.slice(-10).filter((l) => l.sintomas.length > 0);
  const nivelSintomas: EvolucaoGeral['sintomasNivel'] = recentes.length === 0 ? null : recentes.length >= 5 ? 'alta' : recentes.length >= 2 ? 'media' : 'baixa';

  return {
    adesao,
    aplicacoes: aplicacoesPct,
    pesagens: pesagensPct,
    proteina: proteinaPctAbaixo != null ? 100 - proteinaPctAbaixo : null,
    agua: aguaPctAbaixo != null ? 100 - aguaPctAbaixo : null,
    sintomasNivel: nivelSintomas,
  };
}

/* ---------- Tendências ---------- */
function tendenciaSerie(pontos: { date: string; valor: number }[], metrica: Tendencia['metrica'], label: string, unidade: string): Tendencia | null {
  if (pontos.length < 4) return null;
  const meio = Math.floor(pontos.length / 2);
  const primeira = pontos.slice(0, meio);
  const segunda = pontos.slice(meio);
  const m1 = media(primeira.map((p) => p.valor))!;
  const m2 = media(segunda.map((p) => p.valor))!;
  const deltaPct = m1 !== 0 ? ((m2 - m1) / Math.abs(m1)) * 100 : 0;
  const direcao: Tendencia['direcao'] = deltaPct <= -2 ? 'caindo' : deltaPct >= 2 ? 'subindo' : 'estavel';
  const textos: Record<Tendencia['direcao'], string> = {
    caindo: 'Queda consistente no período.',
    subindo: 'Alta consistente no período.',
    estavel: 'Estável, sem variação relevante no período.',
    oscilando: 'Oscilações frequentes no período.',
  };
  return {
    metrica,
    label,
    direcao,
    texto: textos[direcao],
    evidencia: [
      `${label} em ${fmtBR(primeira[0].date)}: ${nf(m1)} ${unidade} (média do início do período)`,
      `${label} em ${fmtBR(segunda[segunda.length - 1].date)}: ${nf(m2)} ${unidade} (média do fim do período)`,
    ],
  };
}

function tendenciaAgua(logsP: DailyLogC[]): Tendencia | null {
  const valores = logsP.filter((l) => l.agua != null).map((l) => l.agua as number);
  if (valores.length < 5) return null;
  const m = media(valores)!;
  const dp = desvioPadrao(valores);
  const oscila = dp != null && m > 0 && dp / m > 0.3;
  return {
    metrica: 'agua',
    label: 'Água',
    direcao: oscila ? 'oscilando' : 'estavel',
    texto: oscila ? 'Oscilações frequentes no consumo diário de água.' : 'Consumo de água consistente ao longo do período.',
    evidencia: [`Média de ${nf(m)} L/dia em ${valores.length} dias registrados no período`],
  };
}

function calcularTendencias(d: DadosClinicos, pesagensP: PesagemC[], bioP: BioC[], logsP: DailyLogC[]): Tendencia[] {
  const out: Tendencia[] = [];
  const peso = tendenciaSerie(pesagensP.map((p) => ({ date: p.date, valor: p.peso })), 'peso', 'Peso', 'kg');
  if (peso) out.push(peso);
  // Guarda contra altura corrompida/mal digitada (ex: "1" em vez de "165") — mesma faixa
  // plausível usada em patient-detail.ts, senão o IMC (fórmula correta) vira um número absurdo.
  if (d.altura && d.altura >= 100 && d.altura <= 250) {
    const imcPontos = pesagensP.map((p) => ({ date: p.date, valor: p.peso / (d.altura! / 100) ** 2 }));
    const imc = tendenciaSerie(imcPontos, 'imc', 'IMC', '');
    if (imc) out.push(imc);
  }
  const gordura = tendenciaSerie(
    bioP.filter((b) => b.gordura != null).map((b) => ({ date: b.date, valor: b.gordura as number })),
    'gordura',
    'Gordura corporal',
    '%'
  );
  if (gordura) out.push(gordura);
  const massa = tendenciaSerie(
    bioP.filter((b) => b.massaMagraPct != null).map((b) => ({ date: b.date, valor: b.massaMagraPct as number })),
    'massaMuscular',
    'Massa muscular',
    '%'
  );
  if (massa) out.push(massa);
  const agua = tendenciaAgua(logsP);
  if (agua) out.push(agua);
  return out;
}

/* ---------- Alertas ---------- */
function alertaLongoPeriodoSemAtualizacao(d: DadosClinicos, hoje: string): AlertaClinico | null {
  const datas = [...d.pesagens.map((p) => p.date), ...d.aplicacoes.map((a) => a.date), ...d.dailyLogs.map((l) => l.date), ...d.bio.map((b) => b.date)];
  if (!datas.length) return null;
  const ultimo = datas.sort().reverse()[0];
  const dias = diasEntre(ultimo, hoje);
  if (dias <= 10) return null;
  const nivel: NivelInsight = dias > 30 ? 'prioritario' : dias > 21 ? 'importante' : 'atencao';
  return {
    id: 'sem_atualizacao',
    nivel,
    titulo: 'Longo período sem atualização',
    explicacao: `O paciente está há ${dias} dias sem registrar qualquer informação no aplicativo.`,
    causaProvavel: 'Perda de engajamento com o tratamento, dificuldade técnica com o app, ou pausa não comunicada.',
    sugestaoAcompanhamento: 'Vale um contato direto pra entender o motivo e reforçar a importância do acompanhamento.',
    evidencia: [`Último registro em ${fmtBR(ultimo)} (${dias} dias atrás)`],
  };
}

function alertaAplicacoesIrregulares(d: DadosClinicos, aplicacoesP: AplicacaoC[], hoje: string): AlertaClinico | null {
  const pct = adesaoSemanal(aplicacoesP.map((a) => a.date), d.dataInicio, hoje, 8);
  if (pct == null || pct >= 80) return null;
  const nivel: NivelInsight = pct < 60 ? 'prioritario' : 'importante';
  return {
    id: 'aplicacoes_irregulares',
    nivel,
    titulo: 'Aplicações irregulares',
    explicacao: `Aplicações registradas em apenas ${pct}% das últimas 8 semanas.`,
    causaProvavel: 'Esquecimento, efeitos colaterais não relatados, dificuldade de acesso à medicação ou desistência parcial do tratamento.',
    sugestaoAcompanhamento: 'Reforçar a rotina de aplicação e investigar se há barreira prática ou efeito colateral por trás das faltas.',
    evidencia: [`${pct}% de adesão nas últimas 8 semanas (dado calculado a partir de ${aplicacoesP.length} aplicações registradas no total)`],
  };
}

function alertaPesoEstabilizado(pesagensP: PesagemC[], hoje: string): AlertaClinico | null {
  const recentes = dentroPeriodo(pesagensP, (() => {
    const c = new Date(hoje + 'T00:00:00');
    c.setDate(c.getDate() - 21);
    return c.toISOString().slice(0, 10);
  })(), hoje);
  if (recentes.length < 3) return null;
  const pesos = recentes.map((p) => p.peso);
  const variacao = Math.max(...pesos) - Math.min(...pesos);
  if (variacao >= 0.3) return null;

  const seisSemanas = dentroPeriodo(pesagensP, (() => {
    const c = new Date(hoje + 'T00:00:00');
    c.setDate(c.getDate() - 42);
    return c.toISOString().slice(0, 10);
  })(), hoje);
  const platoLongo = seisSemanas.length >= 4 && Math.max(...seisSemanas.map((p) => p.peso)) - Math.min(...seisSemanas.map((p) => p.peso)) < 0.5;

  return {
    id: 'peso_estabilizado',
    nivel: platoLongo ? 'importante' : 'atencao',
    titulo: 'Peso estabilizado',
    explicacao: `Variação de apenas ${nf(variacao)} kg nas últimas ${recentes.length} pesagens registradas.`,
    causaProvavel: 'Platô natural do tratamento, adaptação metabólica, ou necessidade de ajuste de dose/plano alimentar.',
    sugestaoAcompanhamento: 'Avaliar se é hora de revisar dose, rotina alimentar ou nível de atividade física com o paciente.',
    evidencia: recentes.map((p) => `${fmtBR(p.date)}: ${nf(p.peso)} kg`),
  };
}

function alertaGanhoInesperado(pesagensP: PesagemC[], hoje: string): AlertaClinico | null {
  if (pesagensP.length < 2) return null;
  const atual = pesagensP[pesagensP.length - 1];
  const referencia = [...pesagensP].reverse().find((p) => diasEntre(p.date, atual.date) >= 25);
  if (!referencia) return null;
  const delta = +(atual.peso - referencia.peso).toFixed(1);
  if (delta < 1) return null;
  return {
    id: 'ganho_inesperado',
    nivel: delta >= 2 ? 'importante' : 'atencao',
    titulo: 'Ganho inesperado de peso',
    explicacao: `Ganho de ${nf(delta)} kg desde ${fmtBR(referencia.date)}.`,
    causaProvavel: 'Retenção hídrica, mudança na rotina alimentar, redução de dose, ou irregularidade nas aplicações.',
    sugestaoAcompanhamento: 'Investigar mudanças recentes de rotina, dose e adesão às aplicações antes da próxima consulta.',
    evidencia: [`${fmtBR(referencia.date)}: ${nf(referencia.peso)} kg`, `${fmtBR(atual.date)}: ${nf(atual.peso)} kg`],
  };
}

function alertaMetaDiaria(logsP: DailyLogC[], meta: number | null, campo: 'agua' | 'proteina', hoje: string, id: string, titulo: string, unidade: string): AlertaClinico | null {
  const pctAbaixo = percentualDiarioAbaixoDaMeta(logsP, campo, meta, hoje);
  if (pctAbaixo == null || pctAbaixo < 60) return null;
  const comRegistro = logsP.filter((l) => diasEntre(l.date, hoje) <= 14 && l[campo] != null);
  return {
    id,
    nivel: 'atencao',
    titulo,
    explicacao: `${campo === 'agua' ? 'Consumo de água' : 'Ingestão de proteína'} abaixo da meta (${meta}${unidade}) em ${pctAbaixo}% dos últimos ${comRegistro.length} dias registrados.`,
    causaProvavel: campo === 'agua' ? 'Rotina diária corrida, esquecimento, ou meta não ajustada à realidade do paciente.' : 'Dificuldade de planejamento de refeições ricas em proteína, ou meta acima do apetite reduzido comum no tratamento.',
    sugestaoAcompanhamento: campo === 'agua' ? 'Reforçar estratégias simples de lembrete de hidratação.' : 'Revisar estratégias de ingestão proteica, considerando o apetite reduzido comum nesta fase do tratamento.',
    evidencia: comRegistro.slice(-5).map((l) => `${fmtBR(l.date)}: ${l[campo]}${unidade}`),
  };
}

function alertaSintomasRecorrentes(logsP: DailyLogC[], aplicacoesP: AplicacaoC[]): AlertaClinico | null {
  const comSintoma = logsP.filter((l) => l.sintomas.length > 0).slice(-5);
  if (comSintoma.length < 3) return null;
  const contagem = new Map<string, string[]>();
  comSintoma.forEach((l) => l.sintomas.forEach((s) => contagem.set(s, [...(contagem.get(s) ?? []), l.date])));
  const [sintoma, datas] = [...contagem.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [null, []];
  if (!sintoma || datas.length < 3) return null;

  const posAplicacao = datas.filter((d) => aplicacoesP.some((a) => diasEntre(a.date, d) >= 0 && diasEntre(a.date, d) <= 2)).length;
  const nivel: NivelInsight = posAplicacao >= 4 ? 'importante' : 'atencao';
  return {
    id: 'sintomas_recorrentes',
    nivel,
    titulo: 'Sintomas recorrentes',
    explicacao: `"${sintoma}" registrado em ${datas.length} dos últimos ${comSintoma.length} registros de sintomas.`,
    causaProvavel: posAplicacao >= 3 ? 'Possível relação com a aplicação/dose atual — sintoma concentrado em dias próximos às aplicações.' : 'Padrão alimentar, adaptação ao tratamento, ou fator não relacionado à medicação.',
    sugestaoAcompanhamento: 'Vale levar esse padrão pra próxima consulta e avaliar se está associado à dose atual.',
    evidencia: datas.map((d) => fmtBR(d)),
  };
}

function alertaBioIncompativel(pesagensP: PesagemC[], bioP: BioC[]): AlertaClinico | null {
  const bioComGordura = bioP.filter((b) => b.gordura != null);
  if (bioComGordura.length < 2 || pesagensP.length < 2) return null;
  const bioIni = bioComGordura[0];
  const bioFim = bioComGordura[bioComGordura.length - 1];
  const pesoNoInicioBio = [...pesagensP].reverse().find((p) => p.date <= bioIni.date) ?? pesagensP[0];
  const pesoNoFimBio = [...pesagensP].reverse().find((p) => p.date <= bioFim.date) ?? pesagensP[pesagensP.length - 1];
  const deltaPeso = pesoNoFimBio.peso - pesoNoInicioBio.peso;
  const deltaGordura = (bioFim.gordura as number) - (bioIni.gordura as number);
  if (deltaPeso > -1 || deltaGordura < 0) return null; // só dispara se peso caiu e %gordura NÃO caiu junto
  return {
    id: 'bio_incompativel',
    nivel: 'importante',
    titulo: 'Bioimpedância incompatível com a tendência de peso',
    explicacao: `Peso caiu ${nf(Math.abs(deltaPeso))} kg no período, mas o percentual de gordura corporal não acompanhou a queda (${deltaGordura > 0 ? '+' : ''}${nf(deltaGordura)} p.p.).`,
    causaProvavel: 'A perda de peso pode estar vindo de massa magra em vez de gordura — possível sinal de ingestão proteica ou atividade física insuficientes.',
    sugestaoAcompanhamento: 'Revisar ingestão de proteína e nível de atividade física com o paciente antes da próxima bioimpedância.',
    evidencia: [
      `Peso em ${fmtBR(pesoNoInicioBio.date)}: ${nf(pesoNoInicioBio.peso)} kg -> ${fmtBR(pesoNoFimBio.date)}: ${nf(pesoNoFimBio.peso)} kg`,
      `Gordura em ${fmtBR(bioIni.date)}: ${nf(bioIni.gordura as number)}% -> ${fmtBR(bioFim.date)}: ${nf(bioFim.gordura as number)}%`,
    ],
  };
}

const ORDEM_NIVEL: Record<NivelInsight, number> = { prioritario: 0, importante: 1, atencao: 2, informativo: 3 };

function calcularAlertas(d: DadosClinicos, hoje: string): AlertaClinico[] {
  const alertas = [
    alertaLongoPeriodoSemAtualizacao(d, hoje),
    alertaAplicacoesIrregulares(d, d.aplicacoes, hoje),
    alertaPesoEstabilizado(d.pesagens, hoje),
    alertaGanhoInesperado(d.pesagens, hoje),
    alertaMetaDiaria(d.dailyLogs, d.metaAgua, 'agua', hoje, 'agua_abaixo_meta', 'Água abaixo da meta', 'L'),
    alertaMetaDiaria(d.dailyLogs, d.metaProteina, 'proteina', hoje, 'proteina_insuficiente', 'Proteína insuficiente', 'g'),
    alertaSintomasRecorrentes(d.dailyLogs, d.aplicacoes),
    alertaBioIncompativel(d.pesagens, d.bio),
  ].filter((a): a is AlertaClinico => a != null);
  return alertas.sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel]);
}

/* ---------- Linha do Tempo Inteligente ---------- */
function calcularTimelineDestaques(d: DadosClinicos): DestaqueTimeline[] {
  const out: DestaqueTimeline[] = [];

  // início de atividade física -> composição corporal
  const primeiroExercicio = d.dailyLogs.find((l) => l.exercicios.length > 0);
  if (primeiroExercicio) {
    const antes = d.bio.filter((b) => b.date < primeiroExercicio.date && b.gordura != null);
    const depois = d.bio.filter((b) => b.date >= primeiroExercicio.date && b.gordura != null);
    if (antes.length && depois.length) {
      const gorduraAntes = antes[antes.length - 1].gordura as number;
      const gorduraDepois = depois[depois.length - 1].gordura as number;
      if (gorduraDepois < gorduraAntes - 0.5) {
        out.push({
          evento: `Início de ${primeiroExercicio.exercicios[0].toLowerCase()} em ${fmtBR(primeiroExercicio.date)}`,
          consequencia: `Redução de ${nf(gorduraAntes - gorduraDepois)} p.p. no percentual de gordura corporal desde então.`,
          evidencia: [`Gordura antes (${fmtBR(antes[antes.length - 1].date)}): ${nf(gorduraAntes)}%`, `Gordura depois (${fmtBR(depois[depois.length - 1].date)}): ${nf(gorduraDepois)}%`],
        });
      }
    }
  }

  // início de sintoma persistente -> quantas aplicações persistiu
  const alertaSintoma = alertaSintomasRecorrentes(d.dailyLogs, d.aplicacoes);
  if (alertaSintoma && alertaSintoma.evidencia.length >= 3) {
    const primeiraData = alertaSintoma.evidencia[0];
    out.push({
      evento: `Início de sintomas recorrentes em ${primeiraData}`,
      consequencia: `Persistiu em ${alertaSintoma.evidencia.length} registros consecutivos de sintomas.`,
      evidencia: alertaSintoma.evidencia,
    });
  }

  return out;
}

/* ---------- Correlações (conjunto fechado, nunca "causou") ---------- */
function calcularCorrelacoes(d: DadosClinicos, hoje: string): Correlacao[] {
  const out: Correlacao[] = [];

  // 1) proteína baixa coincidindo com queda de massa magra
  const pctProteinaAbaixo = percentualDiarioAbaixoDaMeta(d.dailyLogs, 'proteina', d.metaProteina, hoje, 30, 5);
  const bioComMassa = d.bio.filter((b) => b.massaMagraPct != null);
  if (pctProteinaAbaixo != null && pctProteinaAbaixo >= 50 && bioComMassa.length >= 2) {
    const delta = (bioComMassa[bioComMassa.length - 1].massaMagraPct as number) - (bioComMassa[0].massaMagraPct as number);
    if (delta < 0) {
      out.push({
        id: 'proteina_massa_magra',
        texto: `Baixa ingestão proteica (${pctProteinaAbaixo}% dos últimos dias abaixo da meta) coincidiu com redução de massa muscular no mesmo período.`,
        evidencia: [`${pctProteinaAbaixo}% dos dias recentes abaixo da meta de proteína`, `Massa muscular: ${nf(bioComMassa[0].massaMagraPct as number)}% (${fmtBR(bioComMassa[0].date)}) -> ${nf(bioComMassa[bioComMassa.length - 1].massaMagraPct as number)}% (${fmtBR(bioComMassa[bioComMassa.length - 1].date)})`],
      });
    }
  }

  // 2) mais água coincidindo com menos constipação
  const comAgua = d.dailyLogs.filter((l) => l.agua != null);
  if (comAgua.length >= 6) {
    const meio = Math.floor(comAgua.length / 2);
    const aguaAntes = media(comAgua.slice(0, meio).map((l) => l.agua as number))!;
    const aguaDepois = media(comAgua.slice(meio).map((l) => l.agua as number))!;
    const constipacaoAntes = d.dailyLogs.slice(0, Math.floor(d.dailyLogs.length / 2)).filter((l) => l.sintomas.includes('Constipação')).length;
    const constipacaoDepois = d.dailyLogs.slice(Math.floor(d.dailyLogs.length / 2)).filter((l) => l.sintomas.includes('Constipação')).length;
    if (aguaDepois > aguaAntes + 0.2 && constipacaoDepois < constipacaoAntes) {
      out.push({
        id: 'agua_constipacao',
        texto: 'Maior consumo de água coincidiu com redução dos registros de constipação.',
        evidencia: [`Água: média de ${nf(aguaAntes)} L -> ${nf(aguaDepois)} L`, `Registros de constipação: ${constipacaoAntes} -> ${constipacaoDepois}`],
      });
    }
  }

  // 3) atividade física coincidindo com melhora de gordura corporal
  const primeiroExercicio = d.dailyLogs.find((l) => l.exercicios.length > 0);
  if (primeiroExercicio) {
    const antes = d.bio.filter((b) => b.date < primeiroExercicio.date && b.gordura != null);
    const depois = d.bio.filter((b) => b.date >= primeiroExercicio.date && b.gordura != null);
    if (antes.length && depois.length && (depois[depois.length - 1].gordura as number) < (antes[antes.length - 1].gordura as number) - 0.5) {
      out.push({
        id: 'atividade_gordura',
        texto: `Início de atividade física (${fmtBR(primeiroExercicio.date)}) coincidiu com melhora na composição corporal.`,
        evidencia: [`Gordura antes: ${nf(antes[antes.length - 1].gordura as number)}%`, `Gordura depois: ${nf(depois[depois.length - 1].gordura as number)}%`],
      });
    }
  }

  return out;
}

/* ---------- Resumo Clínico ---------- */
function calcularResumo(d: DadosClinicos, alertas: AlertaClinico[], evolucao: EvolucaoGeral, hoje: string): string {
  const graves = alertas.filter((a) => a.nivel === 'importante' || a.nivel === 'prioritario');
  const frases: string[] = [];

  if (graves.length > 0) {
    frases.push(...graves.slice(0, 2).map((a) => a.explicacao));
    frases.push('Recomenda-se reavaliação clínica.');
    return frases.join(' ');
  }

  if (evolucao.adesao != null) {
    frases.push(evolucao.adesao >= 90 ? `Paciente apresenta excelente adesão ao tratamento (${evolucao.adesao}%).` : `Adesão ao tratamento de ${evolucao.adesao}% no período recente.`);
  }
  if (d.pesoInicial != null && d.pesagens.length) {
    const atual = d.pesagens[d.pesagens.length - 1];
    const perdido = +(d.pesoInicial - atual.peso).toFixed(1);
    if (perdido > 0.1 && d.dataInicio) {
      const semanas = Math.max(1, Math.round(diasEntre(d.dataInicio, atual.date) / 7));
      frases.push(`Perda total de ${nf(perdido)} kg em ${semanas} semana${semanas > 1 ? 's' : ''}.`);
    }
  }
  const gordura = d.bio.filter((b) => b.gordura != null);
  if (gordura.length >= 2 && (gordura[gordura.length - 1].gordura as number) < (gordura[0].gordura as number)) {
    frases.push('Boa evolução da composição corporal.');
  }

  const datas = [...d.pesagens.map((p) => p.date), ...d.aplicacoes.map((a) => a.date), ...d.dailyLogs.map((l) => l.date), ...d.bio.map((b) => b.date)];
  if (datas.length) {
    const ultimo = datas.sort().reverse()[0];
    const dias = diasEntre(ultimo, hoje);
    frases.push(dias === 0 ? 'Última atualização hoje.' : `Última atualização realizada há ${dias} dia${dias > 1 ? 's' : ''}.`);
  }

  return frases.length ? frases.join(' ') : 'Ainda não há dados suficientes pra gerar um resumo clínico.';
}

export type HistoricoOpcao = 'hoje' | 'ontem' | 'semana' | 'mes';

/* "Histórico" (hoje/ontem/semana/mês) nunca guarda um snapshot — o
   motor simplesmente recalcula usando só os dados que já existiam
   até aquele corte (date <= cutoff em toda fonte). Mesmo princípio
   "recalcula, nunca armazena" dos outros motores do projeto: se uma
   regra mudar numa sprint futura, o histórico reflete a regra atual
   sobre o dado daquele momento, nunca uma conclusão congelada com
   lógica velha. Documentado na Fase 1 desta sprint. */
export function cutoffDoHistorico(opcao: HistoricoOpcao, hoje: string): string {
  if (opcao === 'hoje') return hoje;
  const d = new Date(hoje + 'T00:00:00');
  if (opcao === 'ontem') d.setDate(d.getDate() - 1);
  else if (opcao === 'semana') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function recortarAteCorte(d: DadosClinicos, corte: string): DadosClinicos {
  return {
    ...d,
    pesagens: d.pesagens.filter((p) => p.date <= corte),
    aplicacoes: d.aplicacoes.filter((a) => a.date <= corte),
    bio: d.bio.filter((b) => b.date <= corte),
    dailyLogs: d.dailyLogs.filter((l) => l.date <= corte),
  };
}

/* ---------- ponto de entrada ---------- */
export function gerarAssistenteClinico(dOriginal: DadosClinicos, opts?: { periodo?: PeriodoComparacao; cutoff?: string }): AssistenteClinico {
  const hojeReal = todayISO();
  const hoje = opts?.cutoff && opts.cutoff < hojeReal ? opts.cutoff : hojeReal;
  const d = opts?.cutoff ? recortarAteCorte(dOriginal, hoje) : dOriginal;

  if (!d.temPerfil || (!d.pesagens.length && !d.aplicacoes.length && !d.dailyLogs.length && !d.bio.length)) {
    return { temDados: false, resumo: '', alertas: [], evolucaoGeral: { adesao: null, aplicacoes: null, pesagens: null, proteina: null, agua: null, sintomasNivel: null }, tendencias: [], correlacoes: [], timelineDestaques: [], geradoEm: hoje };
  }

  const { ini, fim } = periodoRange(opts?.periodo ?? 'tudo', d.dataInicio, hoje);
  const pesagensP = dentroPeriodo(d.pesagens, ini, fim);
  const aplicacoesP = dentroPeriodo(d.aplicacoes, ini, fim);
  const bioP = dentroPeriodo(d.bio, ini, fim);
  const logsP = dentroPeriodo(d.dailyLogs, ini, fim);

  const alertas = calcularAlertas(d, hoje); // alertas sempre olham o histórico completo (até o corte), não o recorte de comparação
  const evolucaoGeral = calcularEvolucaoGeral(d, pesagensP, aplicacoesP, logsP, hoje);
  const tendencias = calcularTendencias(d, pesagensP, bioP, logsP);
  const correlacoes = calcularCorrelacoes(d, hoje);
  const timelineDestaques = calcularTimelineDestaques(d);
  const resumo = calcularResumo(d, alertas, evolucaoGeral, hoje);

  return { temDados: true, resumo, alertas, evolucaoGeral, tendencias, correlacoes, timelineDestaques, geradoEm: hoje };
}
