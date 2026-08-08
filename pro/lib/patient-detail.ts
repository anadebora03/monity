import type { SupabaseClient } from '@supabase/supabase-js';
import { todayISO, diasEntre, proximaAplicacao } from './dashboard';

/* Camada de dados do Perfil 360° do Paciente (Sprint 019). Nenhuma
   tabela nova, nenhuma duplicação de dado: lê direto de profiles/
   weighings/applications/bioimpedance/exams/daily_logs pela mesma
   RLS "select_pro" já criada na Sprint 015 (só concede leitura
   quando existe patient_relationships ativo no workspace do
   profissional logado) — o profissional nunca edita nada aqui.

   Tudo que aparece na tela (timeline, insights clínicos, plano de
   ação) é CALCULADO a partir desses registros, nunca lido de uma
   tabela de "plano de ação" ou "insights" própria — essas não
   existem no lado do paciente como dado sincronizado (js/actionplan.js
   e js/insights.js do app do paciente guardam status/histórico só em
   localStorage, nunca no Supabase). Por isso o plano de ação aqui é
   rotulado como "gerado a partir dos dados sincronizados", não como
   um espelho exato do que a paciente vê no app — seria desonesto
   fingir que é o mesmo estado. */

export type Pesagem = {
  date: string;
  peso: number;
  cintura: number | null;
  quadril: number | null;
  abdomen: number | null;
  coxa: number | null;
  braco: number | null;
};
export type Aplicacao = { date: string; dose: string | null; medicamento: string | null; local: string | null; obs: string | null };
export type BioRegistro = {
  date: string;
  gordura: number | null;
  massaMagraPct: number | null;
  musculo: number | null;
  agua: number | null;
  visceral: number | null;
  tmb: number | null;
};
export type Exame = { date: string; tipo: string | null; valor: string | null };
export type RegistroSintomas = { date: string; sintomas: string[]; humor: number | null };

export type TimelineEvent = {
  id: string;
  data: string;
  categoria:
    | 'cadastro'
    | 'convite'
    | 'tratamento'
    | 'aplicacao'
    | 'dose'
    | 'medicamento'
    | 'peso'
    | 'bioimpedancia'
    | 'exame'
    | 'sintomas'
    | 'conquista'
    | 'plano'
    | 'consulta'
    | 'retorno'
    | 'relatorio';
  titulo: string;
  descricao: string;
  destaque?: boolean;
  insight?: string; // frase curta derivada dos próprios dados (ex: "melhor resultado das últimas 6 pesagens") — nunca IA, só comparação com o histórico já carregado
};

export type CompromissoPaciente = { id: string; data: string; hora: string | null; tipo: string; status: string; observacoes: string | null };

export type PlanoItem = { titulo: string; descricao: string; prioridade: 'alta' | 'media' };

export type PatientDetail = {
  encontrado: boolean;
  perfilCompleto: boolean;
  patientId: string;
  relationshipId: string | null;
  accessSource: 'professional' | 'independent' | null;
  nome: string;
  email: string | null;
  avatarUrl: string | null;
  medicamento: string | null;
  doseAtual: string | null;
  unidade: string | null;
  dataInicio: string | null;
  diaAplicacao: number | null;
  diasTratamento: number | null;
  dataVinculo: string | null;
  statusClinico: 'evolucao' | 'atencao' | 'sem_dado';
  motivosAtencao: string[];

  pesoInicial: number | null;
  pesoAtual: number | null;
  pesoMeta: number | null;
  variacaoTotal: number | null;
  percentualMeta: number | null;
  proximaAplicacaoDias: number | null;
  imc: number | null;
  altura: number | null;

  pesagens: Pesagem[];
  aplicacoes: Aplicacao[];
  bio: BioRegistro[];
  exames: Exame[];
  sintomas: RegistroSintomas[];
  compromissos: CompromissoPaciente[];

  timeline: TimelineEvent[];
  insights: string[];
  planoAcao: PlanoItem[];
};

function vazio(patientId: string): PatientDetail {
  return {
    encontrado: false,
    perfilCompleto: false,
    patientId,
    relationshipId: null,
    accessSource: null,
    nome: 'Paciente',
    email: null,
    avatarUrl: null,
    medicamento: null,
    doseAtual: null,
    unidade: null,
    dataInicio: null,
    diaAplicacao: null,
    diasTratamento: null,
    dataVinculo: null,
    statusClinico: 'sem_dado',
    motivosAtencao: [],
    pesoInicial: null,
    pesoAtual: null,
    pesoMeta: null,
    variacaoTotal: null,
    percentualMeta: null,
    proximaAplicacaoDias: null,
    imc: null,
    altura: null,
    pesagens: [],
    aplicacoes: [],
    bio: [],
    exames: [],
    sintomas: [],
    compromissos: [],
    timeline: [],
    insights: [],
    planoAcao: [],
  };
}

export async function getPatientDetail(supabase: SupabaseClient, patientId: string): Promise<PatientDetail> {
  const { data: rel } = await supabase
    .from('patient_relationships')
    .select('id, nome_convidado, patient_email, accepted_at, access_source')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle();

  if (!rel) return vazio(patientId);

  const [
    { data: profile },
    { data: weighings },
    { data: applications },
    { data: bio },
    { data: exams },
    { data: dailyLogs },
    { data: compromissosRows },
    { data: planosRows },
    { data: relatoriosRows },
  ] = await Promise.all([
    supabase.from('profiles').select('nome, medicamento, dose_atual, unidade, dia_aplicacao, data_inicio, peso_inicial, peso_meta, altura, created_at, avatar_url').eq('id', patientId).maybeSingle(),
    supabase.from('weighings').select('date, peso, cintura, quadril, abdomen, coxa, braco').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('applications').select('date, dose, medicamento, local, obs').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('bioimpedance').select('date, gordura, massa_magra, musculo, agua, visceral, tmb').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('exams').select('date, tipo, valor').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('daily_logs').select('date, sintomas, humor').eq('user_id', patientId).order('date', { ascending: true }),
    supabase.from('compromissos').select('id, data, hora, tipo, status, observacoes').eq('patient_id', patientId).order('data', { ascending: true }),
    supabase.from('planos_terapeuticos').select('id, titulo, categoria, status, created_at, concluido_em').eq('patient_id', patientId).order('created_at', { ascending: true }),
    supabase.from('report_emissions').select('id, periodo_ini, periodo_fim, created_at').eq('patient_id', patientId).order('created_at', { ascending: true }),
  ]);

  const perfilCompleto = !!profile;
  const nome = profile?.nome || rel.nome_convidado || rel.patient_email || 'Paciente';
  const hoje = todayISO();

  const pesagens: Pesagem[] = (weighings ?? []).map((w) => ({
    date: w.date,
    peso: w.peso,
    cintura: w.cintura,
    quadril: w.quadril,
    abdomen: w.abdomen,
    coxa: w.coxa,
    braco: w.braco,
  }));
  const aplicacoes: Aplicacao[] = (applications ?? []) as Aplicacao[];
  const bioRegs: BioRegistro[] = (bio ?? []).map((b) => ({
    date: b.date,
    gordura: b.gordura,
    massaMagraPct: b.massa_magra,
    musculo: b.musculo,
    agua: b.agua,
    visceral: b.visceral,
    tmb: b.tmb,
  }));
  const exames: Exame[] = (exams ?? []) as Exame[];
  const sintomas: RegistroSintomas[] = (dailyLogs ?? [])
    .map((l) => ({ date: l.date as string, sintomas: ((l.sintomas as string[] | null) ?? []).filter((s) => s !== 'Sem sintomas'), humor: l.humor as number | null }))
    .filter((l) => l.sintomas.length > 0);
  const compromissos: CompromissoPaciente[] = (compromissosRows ?? []).map((c) => ({
    id: c.id,
    data: c.data,
    hora: c.hora,
    tipo: c.tipo || 'Compromisso',
    status: c.status,
    observacoes: c.observacoes,
  }));

  const pesoInicial: number | null = profile?.peso_inicial ?? null;
  const pesoMeta: number | null = profile?.peso_meta ?? null;
  const pesoAtual: number | null = pesagens.length ? pesagens[pesagens.length - 1].peso : pesoInicial;
  const variacaoTotal = pesoInicial != null && pesoAtual != null ? +(pesoInicial - pesoAtual).toFixed(1) : null;
  const percentualMeta =
    pesoInicial != null && pesoMeta != null && pesoAtual != null && pesoInicial !== pesoMeta
      ? Math.max(0, Math.min(100, Math.round(((pesoInicial - pesoAtual) / (pesoInicial - pesoMeta)) * 100)))
      : null;
  const altura: number | null = profile?.altura ?? null;
  const imc = pesoAtual != null && altura ? +(pesoAtual / (altura / 100) ** 2).toFixed(1) : null;
  const dataInicio: string | null = profile?.data_inicio ?? null;
  const diasTratamento = dataInicio ? diasEntre(dataInicio, hoje) + 1 : null;
  const ultimaAplicacao = aplicacoes.length ? aplicacoes[aplicacoes.length - 1] : null;
  const proximaAplicacaoDias = proximaAplicacao(profile?.dia_aplicacao ?? null, ultimaAplicacao?.date ?? null);

  // ---------- status clínico + motivos de atenção (mesma régua do Dashboard, Sprint 017) ----------
  const motivos: string[] = [];
  const ultimoRegistroData = [
    pesagens.length ? pesagens[pesagens.length - 1].date : null,
    aplicacoes.length ? aplicacoes[aplicacoes.length - 1].date : null,
  ].filter((d): d is string => !!d);
  const ultimoRegistro = ultimoRegistroData.length ? ultimoRegistroData.sort().reverse()[0] : null;
  if (perfilCompleto) {
    if (ultimoRegistro) {
      const dias = diasEntre(ultimoRegistro, hoje);
      if (dias > 10) motivos.push(`Sem registrar há ${dias} dias`);
    }
    if (ultimaAplicacao && diasEntre(ultimaAplicacao.date, hoje) > 10) motivos.push('Aplicação em atraso');
    if (pesagens.length >= 2) {
      const trintaDiasAtras = pesagens.filter((p) => diasEntre(p.date, hoje) >= 30).slice(-1)[0];
      if (trintaDiasAtras && pesoAtual != null && pesoAtual > trintaDiasAtras.peso) motivos.push('Ganho de peso no período');
    }
  }
  const statusClinico: PatientDetail['statusClinico'] = !perfilCompleto ? 'sem_dado' : motivos.length ? 'atencao' : pesoAtual != null ? 'evolucao' : 'sem_dado';

  // ---------- timeline clínica (Sprint 028 — narrativa completa, mais recente primeiro) ----------
  // Reúne TODO evento clínico já existente na plataforma numa única
  // sequência — nenhuma tabela nova, nenhum recálculo: cada bloco
  // abaixo só traduz um registro já buscado acima pro formato comum
  // TimelineEvent. "destaque" marca os eventos que o brief pediu
  // para ganhar peso visual (marco de 5/10 kg, troca de dose/
  // medicamento, relatório gerado).
  const timeline: TimelineEvent[] = [];
  if (rel.accepted_at) {
    timeline.push({ id: 'convite', data: rel.accepted_at.slice(0, 10), categoria: 'convite', titulo: 'Convite aceito', descricao: 'Vínculo com o profissional confirmado.' });
  }
  if (profile?.created_at) {
    timeline.push({ id: 'cadastro', data: profile.created_at.slice(0, 10), categoria: 'cadastro', titulo: 'Cadastro concluído', descricao: 'Paciente completou o próprio cadastro no app.' });
  }
  if (dataInicio) {
    timeline.push({
      id: 'tratamento:inicio',
      data: dataInicio,
      categoria: 'tratamento',
      titulo: 'Início do tratamento',
      descricao: [pesoInicial != null ? `Peso inicial ${nf(pesoInicial)} kg` : null, profile?.medicamento].filter(Boolean).join(' · ') || 'Marco zero registrado.',
      destaque: true,
    });
  }
  aplicacoes.forEach((a, i) => {
    if (i === 0) {
      timeline.push({
        id: `aplicacao:${a.date}`,
        data: a.date,
        categoria: 'aplicacao',
        titulo: 'Primeira aplicação registrada',
        descricao: [a.medicamento, a.dose, a.local].filter(Boolean).join(' · ') || 'Aplicação registrada.',
      });
      return;
    }
    const anterior = aplicacoes[i - 1];
    if (a.medicamento && anterior.medicamento !== a.medicamento) {
      timeline.push({
        id: `medicamento:${a.date}`,
        data: a.date,
        categoria: 'medicamento',
        titulo: 'Troca de medicamento',
        descricao: `${anterior.medicamento || '—'} → ${a.medicamento}`,
        destaque: true,
      });
    } else if (anterior.dose !== a.dose) {
      timeline.push({
        id: `aplicacao:${a.date}`,
        data: a.date,
        categoria: 'dose',
        titulo: 'Mudança de dose',
        descricao: `${a.medicamento || 'Medicamento'}: ${anterior.dose || '—'} → ${a.dose || '—'}`,
        destaque: true,
      });
    } else {
      timeline.push({
        id: `aplicacao:${a.date}`,
        data: a.date,
        categoria: 'aplicacao',
        titulo: 'Aplicação realizada',
        descricao: [a.medicamento, a.dose, a.local].filter(Boolean).join(' · ') || 'Aplicação registrada.',
      });
    }
  });
  // janela móvel dos últimos deltas de peso — permite dizer "melhor
  // resultado das últimas N pesagens" sem guardar nada, só olhando
  // pra trás no próprio array já carregado (mesmo princípio "nunca
  // IA, só comparação com o histórico" pedido no feedback).
  const deltasPeso: number[] = [];
  pesagens.forEach((p, i) => {
    const anterior = i > 0 ? pesagens[i - 1] : null;
    const delta = anterior ? +(p.peso - anterior.peso).toFixed(1) : null;
    const medidas = [p.cintura ? `cintura ${nf(p.cintura)} cm` : null, p.quadril ? `quadril ${nf(p.quadril)} cm` : null].filter(Boolean).join(', ');
    let insight: string | undefined;
    if (delta != null) {
      const janela = deltasPeso.slice(-6);
      if (janela.length >= 3 && delta < Math.min(...janela)) insight = `Melhor resultado das últimas ${janela.length} pesagens.`;
      deltasPeso.push(delta);
    }
    timeline.push({
      id: `peso:${p.date}`,
      data: p.date,
      categoria: 'peso',
      titulo: 'Nova pesagem',
      descricao: `${nf(p.peso)} kg${delta != null ? ` (${delta >= 0 ? '+' : ''}${nf(delta)} kg desde a última pesagem)` : ''}${medidas ? ' · ' + medidas : ''}`,
      insight,
    });
  });
  bioRegs.forEach((b, i) => {
    const anterior = i > 0 ? bioRegs[i - 1] : null;
    const partes = [
      b.gordura != null ? `${nf(b.gordura)}% gordura${anterior?.gordura != null ? (b.gordura < anterior.gordura ? ' (reduziu)' : b.gordura > anterior.gordura ? ' (aumentou)' : '') : ''}` : null,
      b.massaMagraPct != null ? `${nf(b.massaMagraPct)}% massa muscular` : null,
    ].filter(Boolean);
    const massaPreservada = b.massaMagraPct != null && anterior?.massaMagraPct != null && b.massaMagraPct >= anterior.massaMagraPct;
    timeline.push({
      id: `bio:${b.date}`,
      data: b.date,
      categoria: 'bioimpedancia',
      titulo: 'Bioimpedância realizada',
      descricao: partes.join(' · ') || 'Registro de composição corporal.',
      insight: massaPreservada ? 'Massa muscular preservada.' : undefined,
    });
  });
  exames.forEach((e) => {
    timeline.push({ id: `exame:${e.date}:${e.tipo}`, data: e.date, categoria: 'exame', titulo: 'Novo exame', descricao: [e.tipo, e.valor].filter(Boolean).join(': ') || 'Exame laboratorial.' });
  });
  sintomas.forEach((s) => {
    timeline.push({ id: `sintomas:${s.date}`, data: s.date, categoria: 'sintomas', titulo: 'Sintomas registrados', descricao: s.sintomas.join(', ') });
  });
  if (pesoInicial != null) {
    [1, 5, 10].forEach((marco) => {
      const atingiu = pesagens.find((p) => +(pesoInicial - p.peso).toFixed(1) >= marco);
      if (atingiu) {
        timeline.push({
          id: `conquista:${marco}`,
          data: atingiu.date,
          categoria: 'conquista',
          titulo: `Meta de ${marco} kg atingida`,
          descricao: `${marco} kg perdidos desde o início do tratamento.`,
          destaque: marco >= 5,
        });
      }
    });
  }
  (planosRows ?? []).forEach((pl) => {
    const concluido = pl.status === 'concluido' && pl.concluido_em;
    timeline.push({
      id: `plano:${pl.id}`,
      data: (concluido ? pl.concluido_em! : pl.created_at).slice(0, 10),
      categoria: 'plano',
      titulo: concluido ? 'Orientação concluída' : 'Plano terapêutico atualizado',
      descricao: `${pl.titulo} (${pl.categoria})`,
    });
  });
  (compromissosRows ?? []).forEach((c) => {
    if (c.status === 'cancelado' || c.data > hoje) return; // futuro fica só na aba Agenda — ainda não é história
    timeline.push({
      id: `compromisso:${c.id}`,
      data: c.data,
      categoria: c.tipo === 'Retorno' ? 'retorno' : 'consulta',
      titulo: c.tipo || 'Compromisso',
      descricao: [c.observacoes, c.hora ? `Horário: ${c.hora.slice(0, 5)}` : null].filter(Boolean).join(' · ') || 'Compromisso registrado.',
    });
  });
  (relatoriosRows ?? []).forEach((r) => {
    timeline.push({
      id: `relatorio:${r.id}`,
      data: r.created_at.slice(0, 10),
      categoria: 'relatorio',
      titulo: 'Relatório gerado',
      descricao: `Período de ${fmtBR(r.periodo_ini)} a ${fmtBR(r.periodo_fim)}.`,
      destaque: true,
    });
  });
  timeline.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  // ---------- insights clínicos ----------
  const insights: string[] = [];
  if (dataInicio) {
    const semanasTotal = Math.floor(diasEntre(dataInicio, hoje) / 7);
    if (semanasTotal >= 2) {
      const semanasComApp = new Set<number>();
      aplicacoes.forEach((a) => {
        const idx = Math.floor(diasEntre(dataInicio, a.date) / 7);
        if (idx >= 0 && idx < semanasTotal) semanasComApp.add(idx);
      });
      const pct = Math.round((semanasComApp.size / semanasTotal) * 100);
      if (!isNaN(pct)) {
        insights.push(pct >= 90 ? `Excelente adesão: aplicações registradas em ${pct}% das semanas do tratamento.` : `Adesão de ${pct}% às aplicações desde o início do tratamento.`);
      }
    }
  }
  if (ultimoRegistro) {
    const dias = diasEntre(ultimoRegistro, hoje);
    insights.push(dias === 0 ? 'Última atualização hoje.' : `Última atualização há ${dias} dia${dias > 1 ? 's' : ''}.`);
  }
  if (dataInicio && pesoInicial != null && pesoAtual != null && pesagens.length >= 2) {
    const semanas = Math.max(1, diasEntre(dataInicio, pesagens[pesagens.length - 1].date) / 7);
    const perdaSemana = (pesoInicial - pesoAtual) / semanas;
    if (perdaSemana > 0.05) insights.push(`Perda média de ${nf(perdaSemana)} kg por semana desde o início.`);
  }
  const recentesComSintoma = sintomas.slice(-5);
  if (recentesComSintoma.length >= 3) {
    const contagem = new Map<string, number>();
    recentesComSintoma.forEach((s) => s.sintomas.forEach((sn) => contagem.set(sn, (contagem.get(sn) ?? 0) + 1)));
    const recorrente = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];
    if (recorrente && recorrente[1] >= 3) insights.push(`${recorrente[0]} registrado em ${recorrente[1]} dos últimos ${recentesComSintoma.length} registros de sintomas.`);
  } else if (sintomas.length > 0 && recentesComSintoma.length === 0) {
    insights.push('Sem sintomas importantes nos registros recentes.');
  }

  // ---------- plano de ação (derivado dos mesmos dados — não é um espelho do plano local do paciente) ----------
  const planoAcao: PlanoItem[] = [];
  if (motivos.includes('Aplicação em atraso')) {
    planoAcao.push({ titulo: 'Aplicação em atraso', descricao: `Última aplicação há mais de 10 dias (${ultimaAplicacao ? fmtBR(ultimaAplicacao.date) : '—'}).`, prioridade: 'alta' });
  }
  const semRegistroMotivo = motivos.find((m) => m.startsWith('Sem registrar'));
  if (semRegistroMotivo) planoAcao.push({ titulo: semRegistroMotivo, descricao: 'Pode valer confirmar se o paciente ainda está engajado com o tratamento.', prioridade: 'media' });
  if (motivos.includes('Ganho de peso no período')) planoAcao.push({ titulo: 'Ganho de peso no período', descricao: 'Vale conversar sobre possíveis ajustes na próxima consulta.', prioridade: 'media' });
  const insightSintoma = insights.find((i) => i.includes('registrado em') && i.includes('registros de sintomas'));
  if (insightSintoma) planoAcao.push({ titulo: 'Sintoma recorrente', descricao: insightSintoma, prioridade: 'media' });

  return {
    encontrado: true,
    perfilCompleto,
    patientId,
    relationshipId: rel.id,
    accessSource: rel.access_source,
    nome,
    email: rel.patient_email,
    avatarUrl: profile?.avatar_url ?? null,
    medicamento: profile?.medicamento ?? null,
    doseAtual: profile?.dose_atual ?? null,
    unidade: profile?.unidade ?? null,
    dataInicio,
    diaAplicacao: profile?.dia_aplicacao ?? null,
    diasTratamento,
    dataVinculo: rel.accepted_at,
    statusClinico,
    motivosAtencao: motivos,
    pesoInicial,
    pesoAtual,
    pesoMeta,
    variacaoTotal,
    percentualMeta,
    proximaAplicacaoDias,
    imc,
    altura,
    pesagens,
    aplicacoes,
    bio: bioRegs,
    exames,
    sintomas,
    compromissos,
    timeline,
    insights,
    planoAcao,
  };
}

function nf(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fmtBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
