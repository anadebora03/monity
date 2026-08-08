/* SINCRONIZADO automaticamente de js/report-engine.js (raiz do repo) — não editar aqui.
   Rodar "node scripts/sync-shared.js" (ou npm run dev/build) pra atualizar. */
/* ============================================================
   MONITY · Report Engine — motor único de relatório clínico
   (Sprint 020)

   Existe UM relatório só. O app do paciente e o Monity Pro
   chamam exatamente este arquivo (o Pro carrega este mesmo
   arquivo, copiado em build-time de js/report-engine.js — nunca
   uma reescrita) pra gerar o mesmo HTML A4, com a mesma
   identidade visual, a mesma lógica de cálculo.

   Diferença de app.js: nada aqui lê `S`, `window`, `document` ou
   qualquer estado global. Toda função recebe os dados de que
   precisa como parâmetro explícito — só assim o mesmo motor roda
   tanto no app do paciente (dados vêm de `S`, local) quanto no
   painel do profissional (dados vêm do Supabase, buscados por
   paciente/período). `Linha do tempo`, `Insights do período` e
   `Plano de acompanhamento` chegam AQUI já prontos (arrays) — quem
   monta o contexto e chama TIMELINE.gerar()/INSIGHTS.gerar()/
   ACTIONPLAN.gerar() é o chamador (app.js ou o Pro), porque esses
   três motores têm efeitos colaterais específicos de cada ambiente
   (histórico em localStorage no app do paciente; nenhum no Pro).
   ============================================================ */

/* ---------- helpers puros (pequenas cópias deliberadas dos
   equivalentes em app.js — formatação de texto, não lógica de
   negócio; duplicar isso é mais seguro do que acoplar os dois
   arquivos por causa de um pad()) ---------- */
const REPORT_pad = (n) => String(n).padStart(2, '0');
function reportTodayISO(d = new Date()) {
  return d.getFullYear() + '-' + REPORT_pad(d.getMonth() + 1) + '-' + REPORT_pad(d.getDate());
}
function reportParseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function reportFmtBR(iso) {
  const d = reportParseISO(iso);
  return REPORT_pad(d.getDate()) + '/' + REPORT_pad(d.getMonth() + 1);
}
function reportFmtBRy(iso) {
  const d = reportParseISO(iso);
  return REPORT_pad(d.getDate()) + '/' + REPORT_pad(d.getMonth() + 1) + '/' + d.getFullYear();
}
function reportDaysBetween(a, b) {
  return Math.round((reportParseISO(b) - reportParseISO(a)) / 864e5);
}
function reportDaysAgo(iso, hoje = new Date()) {
  const h = new Date(hoje);
  h.setHours(0, 0, 0, 0);
  return Math.round((h - reportParseISO(iso)) / 864e5);
}
function reportNf(n, d = 1) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function reportEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function reportPlural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm || singular + 's';
}
const REPORT_WD = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function reportSortedByDate(arr) {
  return [...arr].sort((a, b) => (a.date < b.date ? -1 : 1));
}
/* Último peso conhecido em ou antes de `dateISO`, dentro do histórico
   COMPLETO (não só o recorte do período) — nunca "o primeiro peso
   registrado dentro do período" (que ignoraria pesagens anteriores ao
   período, a causa real do bug de "peso inicial do período" incoerente
   com o dashboard) nem "o peso mais antigo já registrado" (o fallback
   antigo, que podia pegar um valor de meses antes do período, sem
   relação nenhuma com a data pedida). `sortedAllW` já vem ordenado
   ascendente (reportSortedByDate). */
function reportWeightAtOrBefore(sortedAllW, dateISO) {
  let found = null;
  for (const w of sortedAllW) { if (w.date <= dateISO) found = w; else break; }
  return found;
}
function reportCurrentWeight(weighings, profile) {
  const w = reportSortedByDate(weighings);
  return w.length ? w[w.length - 1].peso : profile.pesoInicial;
}
function reportLastApp(applications) {
  const a = reportSortedByDate(applications);
  return a.length ? a[a.length - 1] : null;
}
function reportNextAppInfo(profile, applications) {
  const wd = profile.diaAplicacao;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let diff = (wd - now.getDay() + 7) % 7;
  const la = reportLastApp(applications);
  if (diff === 0 && la && la.date === reportTodayISO(now)) diff = 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return { days: diff, date: reportTodayISO(next), weekday: REPORT_WD[wd] };
}
function reportLost(weighings, profile) {
  return +(profile.pesoInicial - reportCurrentWeight(weighings, profile)).toFixed(1);
}
function reportLostPct(weighings, profile) {
  return profile.pesoInicial ? (reportLost(weighings, profile) / profile.pesoInicial) * 100 : 0;
}
function reportDaysTreat(profile) {
  return reportDaysAgo(profile.dataInicio) + 1;
}

/* ============================================================
   achievements — mesma lógica de app.js, parametrizada. Único
   desvio possível: "Primeira foto" nunca desbloqueia quando chamado
   a partir do Pro, porque fotos de evolução são locais ao aparelho
   da paciente e nunca sincronizam (mesma limitação já documentada
   na Sprint 019) — `weighings` vindo do Supabase nunca tem `foto`.
   ============================================================ */
function reportAchievements(weighings, profile) {
  const l = reportLost(weighings, profile);
  const dt = reportDaysTreat(profile);
  const firstPhoto = weighings.find((x) => x.foto);
  const mk = (cond, ic, t, s, date) => ({ on: !!cond, ic, t, s, date: cond ? date : null });
  const w = reportSortedByDate(weighings);
  const dateAtLoss = (kg) => {
    for (const x of w) { if (profile.pesoInicial - x.peso >= kg) return x.date; }
    return null;
  };
  const startPlus = (d) => {
    const dt2 = reportParseISO(profile.dataInicio);
    dt2.setDate(dt2.getDate() + d);
    return reportTodayISO(dt2);
  };
  return [
    mk(l >= 1, '🌱', 'Primeiro kg', '−1 kg alcançado', dateAtLoss(1)),
    mk(l >= 5, '🎯', '−5 kg', 'Marco importante', dateAtLoss(5)),
    mk(l >= 10, '🏆', '−10 kg', 'Grande conquista', dateAtLoss(10)),
    mk(dt >= 30, '📅', 'Primeiro mês', '30 dias de tratamento', startPlus(30)),
    mk(dt >= 90, '🔥', '3 meses', 'Consistência', startPlus(90)),
    mk(dt >= 180, '💎', '6 meses', 'Persistência', startPlus(180)),
    mk(dt >= 100, '💯', '100 dias', 'Cem dias de jornada', startPlus(100)),
    mk(firstPhoto, '📸', 'Primeira foto', 'Registro visual', firstPhoto ? firstPhoto.date : null),
  ];
}

/* ============================================================
   coletaDados — mesma lógica de app.js, parametrizada.
   `data` = { weighings, applications, dailyLogs (array de
   {date,...}), bio, exams, profile }
   ============================================================ */
function reportColetaDados(data, ini, fim) {
  const { weighings, applications, dailyLogs, bio, exams, profile } = data;
  const inRange = (d) => d >= ini && d <= fim;
  const w = reportSortedByDate(weighings).filter((x) => inRange(x.date));
  const apps = applications.filter((x) => inRange(x.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const logs = dailyLogs.filter((l) => inRange(l.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const bioP = (bio || []).filter((x) => inRange(x.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const examsP = (exams || []).filter((x) => inRange(x.date));

  const allW = reportSortedByDate(weighings);
  /* peso inicial do período: último peso conhecido em ou antes de `ini`
     (histórico completo, não só dentro do recorte) — fallback legítimo
     e único é o peso inicial do TRATAMENTO, quando não existe nenhuma
     pesagem anterior ao período. Nunca "primeiro peso dentro do
     período" nem "peso mais antigo já registrado" (bug anterior: podia
     devolver uma pesagem de meses antes do período, sem relação com a
     data pedida). */
  const pesoIniPeriodReg = reportWeightAtOrBefore(allW, ini);
  const pesoIniPeriod = pesoIniPeriodReg ? pesoIniPeriodReg.peso : profile.pesoInicial;
  /* peso atual do período: último peso conhecido em ou antes de `fim`
     — nunca o peso mais recente do perfil se ele foi registrado DEPOIS
     da data final do relatório (relatórios históricos não podem usar
     dado do futuro em relação ao próprio período). */
  const pesoFimPeriodReg = reportWeightAtOrBefore(allW, fim);
  const pesoFimPeriod = pesoFimPeriodReg ? pesoFimPeriodReg.peso : pesoIniPeriod;
  const varPeso = +(pesoFimPeriod - pesoIniPeriod).toFixed(1);

  const diasAgua = logs.filter((l) => l.agua > 0);
  const mediaAgua = diasAgua.length ? +(diasAgua.reduce((s, l) => s + l.agua, 0) / diasAgua.length).toFixed(1) : 0;
  const metaAguaAtingida = diasAgua.filter((l) => l.agua >= profile.metaAgua).length;

  const diasProt = logs.filter((l) => l.proteina > 0);
  const mediaProt = diasProt.length ? Math.round(diasProt.reduce((s, l) => s + l.proteina, 0) / diasProt.length) : 0;
  const adesaoProt = profile.metaProteina ? Math.round((mediaProt / profile.metaProteina) * 100) : 0;

  const contSint = {};
  logs.forEach((l) => (l.sintomas || []).filter((s) => s !== 'Sem sintomas').forEach((s) => { contSint[s] = (contSint[s] || 0) + 1; }));

  const diasHumor = logs.filter((l) => l.humor > 0);
  const mediaHumor = diasHumor.length ? +(diasHumor.reduce((s, l) => s + l.humor, 0) / diasHumor.length).toFixed(1) : 0;

  const contAp = {};
  logs.forEach((l) => { if (l.apetite) contAp[l.apetite] = (contAp[l.apetite] || 0) + 1; });
  const apetiteDom = Object.entries(contAp).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const na = reportNextAppInfo(profile, applications);
  const lastAppObj = reportLastApp(applications);
  // total do tratamento inteiro (históricas informadas no onboarding "já
  // comecei antes" + todas as registradas no Monity, sem filtro de
  // período) — exibido ao lado de "aplicações no período" pra não parecer
  // contraditório com o card "Aplicações" do app (mesmo total de lá).
  const totalAplicacoesTratamento = (profile.historicalApplicationsCount || 0) + applications.length;

  return {
    w, apps, logs, bio: bioP, exams: examsP, pesoIniPeriod, pesoFimPeriod, varPeso,
    mediaAgua, metaAguaAtingida, diasTotal: logs.length, mediaProt, adesaoProt,
    contSint, mediaHumor, apetiteDom, na, lastAppObj, totalAplicacoesTratamento,
  };
}

/* ============================================================
   gerarResumo — mesma lógica de app.js, parametrizada.
   ============================================================ */
function reportGerarResumo(d, ini, fim, profile) {
  const frases = [];

  if (d.varPeso < 0) frases.push(`No período avaliado (${reportFmtBRy(ini)} a ${reportFmtBRy(fim)}), o peso apresentou redução de ${reportNf(Math.abs(d.varPeso))} kg.`);
  else if (d.varPeso === 0) frases.push(`No período avaliado (${reportFmtBRy(ini)} a ${reportFmtBRy(fim)}), o peso manteve-se estável.`);
  else frases.push(`No período avaliado (${reportFmtBRy(ini)} a ${reportFmtBRy(fim)}), houve variação de +${reportNf(d.varPeso)} kg no peso.`);

  const hidTxt = d.mediaAgua >= profile.metaAgua * 0.85 ? 'manteve-se em nível satisfatório' : d.mediaAgua > 0 ? 'ficou abaixo da meta diária estabelecida' : null;
  const protTxt = d.adesaoProt >= 90 ? 'a meta proteica foi bem atendida' : d.adesaoProt >= 70 ? 'a ingestão proteica ficou próxima da meta' : d.adesaoProt > 0 ? 'a ingestão proteica esteve abaixo da meta' : null;
  if (hidTxt && protTxt) frases.push(`A hidratação ${hidTxt}, e ${protTxt}.`);
  else if (hidTxt) frases.push(`A hidratação ${hidTxt}.`);
  else if (protTxt) frases.push(`Quanto à alimentação, ${protTxt}.`);

  const nSint = Object.values(d.contSint).reduce((s, v) => s + v, 0);
  const sintTxt = nSint === 0 ? 'Não foram registrados sintomas relevantes no período' : nSint <= 3 ? 'Os sintomas registrados foram leves e ocasionais' : 'Foram registrados sintomas com certa frequência ao longo do período';
  const appTxt = d.apps.length > 0 ? `, com ${d.apps.length} ${reportPlural(d.apps.length, 'aplicação', 'aplicações')} de ${reportEsc(profile.medicamento)} ${reportPlural(d.apps.length, 'realizada', 'realizadas')} no intervalo` : '';
  frases.push(`${sintTxt}${appTxt}.`);

  frases.push('Este relatório foi gerado automaticamente a partir dos registros do paciente e não substitui a avaliação do médico ou nutricionista responsável.');
  return frases.join(' ');
}

/* ============================================================
   buildPDF — mesmo HTML/CSS de app.js, parametrizado.

   ctx = {
     profile, d (coletaDados output), ini, fim,
     allWeighings,        // TODAS as pesagens (não só do período) — medidas/lost/daysTreat usam
     timeline,             // já computado por TIMELINE.gerar() + já filtrado/reordenado
     insightsPeriodo,      // já computado por INSIGHTS.gerar(...).slice(0,5)
     acoesAlta,            // já computado por ACTIONPLAN.gerar(...).filter(alta+não resolvida)
     modulos,               // opcional — {peso,aplicacoes,bioimpedancia,exames,medidas,sintomas,planoAcao,timeline,insights}, default todos true
     cabecalho,             // opcional (só o Pro usa) — {profissionalNome, profissao}
     assinatura,            // opcional (só o Pro usa) — {nome, profissao, crnCrm}
   }
   ============================================================ */
function reportBuildPDF(ctx) {
  const { profile: p, d, ini, fim, allWeighings, timeline, insightsPeriodo, acoesAlta, planoTerapeutico, cabecalho, assinatura } = ctx;
  const modulos = Object.assign(
    { peso: true, aplicacoes: true, bioimpedancia: true, exames: true, medidas: true, sintomas: true, planoAcao: true, timeline: true, insights: true, planoTerapeutico: true },
    ctx.modulos || {}
  );
  const na = d.na;
  const falta = +(reportCurrentWeight(allWeighings, p) - p.pesoMeta).toFixed(1);
  const adesaoProt = d.adesaoProt;
  const H = ['', 'Muito baixo', 'Baixo', 'Moderado', 'Bom', 'Muito bom'];
  const diasHumor = d.logs.filter((l) => l.humor > 0);
  const sintomasTodos = ['Náusea', 'Azia', 'Vômito', 'Constipação', 'Diarreia', 'Dor de cabeça', 'Fadiga', 'Gases'];
  const comSint = sintomasTodos.filter((s) => d.contSint[s] > 0);
  const tl = modulos.timeline ? timeline || [] : [];

  function sparkSVG(weighings) {
    if (weighings.length < 2) return '';
    const W = 480, H2 = 112, pl = 38, pr = 10, pt = 16, pb = 26;
    const ys = weighings.map((w) => w.peso);
    const goal = p.pesoMeta;
    const mn = Math.min(...ys, goal) - 0.5, mx = Math.max(...ys) + 0.5, rng = mx - mn || 1;
    const X = (i) => pl + (i / (weighings.length - 1)) * (W - pl - pr);
    const Y = (v) => pt + (1 - (v - mn) / rng) * (H2 - pt - pb);
    const path = weighings.map((w, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(w.peso).toFixed(1)).join(' ');
    const area = path + ` L${X(weighings.length - 1).toFixed(1)},${(H2 - pb).toFixed(1)} L${X(0).toFixed(1)},${(H2 - pb).toFixed(1)} Z`;
    const gy = Y(goal);
    const yLabels = [mn, mn + (mx - mn) / 2, mx]
      .map((v) => {
        const cy = Y(v);
        return `<text x="${pl - 4}" y="${cy + 4}" text-anchor="end" font-size="8" fill="var(--gray)" font-family="Arial">${reportNf(v)}</text>
<line x1="${pl}" y1="${cy}" x2="${W - pr}" y2="${cy}" stroke="var(--border)" stroke-width="0.8"/>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${W} ${H2}" style="width:100%;height:${H2}px;display:block;margin:12px 0 4px">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--blue)" stop-opacity=".16"/>
        <stop offset="1" stop-color="var(--blue)" stop-opacity="0"/></linearGradient></defs>
      ${yLabels}
      ${goal > mn && goal < mx ? `<line x1="${pl}" y1="${gy.toFixed(1)}" x2="${W - pr}" y2="${gy.toFixed(1)}" stroke="var(--amber)" stroke-width="1.2" stroke-dasharray="5,3"/>
        <text x="${W - pr}" y="${(gy - 3).toFixed(1)}" text-anchor="end" font-size="8" fill="var(--amber)" font-family="Arial">meta ${reportNf(goal)}</text>` : ''}
      <path d="${area}" fill="url(#rg)"/>
      <polyline points="${weighings.map((w, i) => X(i).toFixed(1) + ',' + Y(w.peso).toFixed(1)).join(' ')}" fill="none" stroke="var(--blue)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
      ${weighings.map((w, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(w.peso).toFixed(1)}" r="${i === weighings.length - 1 ? 3 : 1.8}" fill="${i === weighings.length - 1 ? 'var(--navy)' : 'var(--blue)'}" stroke="#fff" stroke-width="1.2"/>`).join('')}
      <text x="${X(0).toFixed(1)}" y="${H2 - 4}" font-size="8" fill="var(--gray)" font-family="Arial">${reportFmtBR(weighings[0].date)}</text>
      <text x="${X(weighings.length - 1).toFixed(1)}" y="${H2 - 4}" text-anchor="end" font-size="8" fill="var(--gray)" font-family="Arial">${reportFmtBR(weighings[weighings.length - 1].date)}</text>
    </svg>`;
  }

  function pillDiff(diff, txt) {
    if (diff == null) return `<span class="pill flat">—</span>`;
    return `<span class="pill ${diff <= 0 ? 'pos' : 'neg'}">${txt}</span>`;
  }

  function medidasSec() {
    if (!modulos.medidas) return '';
    const measures = [['cintura', 'Cintura'], ['abdomen', 'Abdômen'], ['quadril', 'Quadril'], ['braco', 'Braço'], ['coxa', 'Coxa']];
    const wAll = reportSortedByDate(allWeighings);
    const rows = measures
      .map(([k, lbl]) => {
        const withM = wAll.filter((x) => x[k] != null);
        if (!withM.length) return '';
        const f = withM[0][k], l = withM[withM.length - 1][k];
        const single = withM.length < 2;
        const diff = single ? null : +(l - f).toFixed(1);
        return `<tr>
        <td>${lbl}</td>
        <td>${single ? '—' : reportNf(f) + ' cm'}</td>
        <td style="font-weight:600;color:var(--navy)">${reportNf(l)} cm</td>
        <td>${pillDiff(diff, diff == null ? '—' : (diff <= 0 ? '−' : '+') + reportNf(Math.abs(diff)) + ' cm')}</td>
      </tr>`;
      })
      .join('');
    if (!rows) return '';
    return `<div class="section">
      <div class="section-head"><span class="dot"></span><span class="section-title">Evolução das medidas corporais</span></div>
      <p class="nota">Comparativo desde o início do tratamento (${reportFmtBRy(p.dataInicio)})</p>
      <div class="dt"><table><thead><tr><th style="text-align:left">Medida</th><th>Inicial</th><th>Atual</th><th>Diferença</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  function bioSec() {
    if (!modulos.bioimpedancia || !d.bio || !d.bio.length) return '';
    const BIOM = [
      ['gordura', 'Gordura corporal', '%', 'down'], ['massaMagraPct', 'Massa muscular (%)', '%', 'up'],
      ['musculo', 'Massa muscular (kg)', 'kg', 'up'], ['agua', 'Água corporal', '%', 'up'],
      ['visceral', 'Gordura visceral', '', 'down'], ['tmb', 'Metabolismo basal', 'kcal', 'up'],
    ];
    const bf = d.bio[0], bl = d.bio[d.bio.length - 1];
    const single = d.bio.length < 2;
    const rows = BIOM.filter(([k]) => bf[k] != null || bl[k] != null)
      .map(([k, lbl, u, better]) => {
        const dec = u === 'kcal' ? 0 : 1;
        const vi = bf[k], va = bl[k];
        const diff = !single && vi != null && va != null ? +(va - vi).toFixed(2) : null;
        const goodDiff = diff != null && (better === 'down' ? diff > 0 : diff < 0) ? -diff : diff;
        return `<tr>
        <td>${lbl}</td>
        <td>${single ? '—' : vi != null ? reportNf(vi, dec) + ' ' + u : '—'}</td>
        <td style="font-weight:600;color:var(--navy)">${va != null ? reportNf(va, dec) + ' ' + u : '—'}</td>
        <td>${pillDiff(goodDiff, diff == null ? '—' : (diff <= 0 ? '−' : '+') + reportNf(Math.abs(diff), dec) + ' ' + u)}</td>
      </tr>`;
      })
      .join('');
    if (!rows) return '';
    const nota = single ? `1 registro no período, em ${reportFmtBRy(bf.date)} — comparativo indisponível.` : `Comparativo entre ${reportFmtBRy(bf.date)} e ${reportFmtBRy(bl.date)}`;
    return `<div class="section">
      <div class="section-head"><span class="dot"></span><span class="section-title">Evolução da bioimpedância</span></div>
      <p class="nota">${nota}</p>
      <div class="dt"><table><thead><tr><th style="text-align:left">Indicador</th><th>Inicial</th><th>Atual</th><th>Diferença</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  /* EXAMES — não existia no relatório original (coletaDados() já
     recolhia d.exams, mas nenhuma tela do relatório desenhava essa
     seção). Achado durante a extração desta sprint; a Sprint 020
     pede "Exames" explicitamente na estrutura do relatório, então
     esta seção é nova NO MOTOR (beneficia os dois ambientes por
     igual), não uma criação paralela pro Pro. */
  function examesSec() {
    if (!modulos.exames || !d.exams || !d.exams.length) return '';
    const rows = [...d.exams]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((e) => `<tr><td>${reportFmtBRy(e.date)}</td><td>${reportEsc(e.tipo || '—')}</td><td style="font-weight:600;color:var(--navy)">${reportEsc(e.valor || '—')}</td></tr>`)
      .join('');
    return `<div class="section">
      <div class="section-head"><span class="dot"></span><span class="section-title">Exames laboratoriais</span></div>
      <div class="dt"><table><thead><tr><th style="text-align:left">Data</th><th style="text-align:left">Exame</th><th style="text-align:left">Resultado</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  const topSint = Object.entries(d.contSint).sort((a, b) => b[1] - a[1])[0];
  const rxSecundario = [
    ['Peso inicial do período', reportNf(d.pesoIniPeriod) + ' kg'],
    ['Peso atual', reportNf(d.pesoFimPeriod) + ' kg'],
    ['Dose atual', reportEsc(p.doseAtual) + ' ' + reportEsc(p.unidade)],
    ['Adesão à meta proteica', d.mediaProt > 0 ? adesaoProt + '%' : '—'],
    ['Média de hidratação', d.diasTotal > 0 && d.mediaAgua > 0 ? reportNf(d.mediaAgua) + ' L' : '—'],
    ['Principal sintoma', topSint ? `${topSint[0]} (${topSint[1]}d)` : 'Nenhum registrado'],
  ];

  const cabecalhoLinha = cabecalho
    ? `<span>Profissional responsável: <b>${reportEsc(cabecalho.profissionalNome)}${cabecalho.profissao ? ', ' + reportEsc(cabecalho.profissao) : ''}</b></span>`
    : '';

  const assinaturaBloco = assinatura
    ? `<div class="section" style="margin-top:40px">
        <div style="border-top:1px solid var(--border);width:220px;margin:38px auto 8px"></div>
        <p style="text-align:center;font-size:8.5pt;font-weight:600;color:var(--navy)">${reportEsc(assinatura.nome)}</p>
        <p style="text-align:center;font-size:7.5pt;color:var(--gray)">${[assinatura.profissao, assinatura.crnCrm].filter(Boolean).map(reportEsc).join(' · ')}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monity · Relatório · ${reportEsc(p.nome)}</title>
<style>
:root{
  --navy:#16294A; --blue:#2E6FC9; --blue-light:#4FA0FA; --blue-soft:#EAF2FE;
  --ink:#1F2937; --gray:#64748B; --gray-soft:#94A3B8;
  --border:#E5E9F0; --bg-soft:#F7F9FC; --amber:#D99A2B; --amber-soft:#FBF1DD;
  --symptom:#C0524A; --symptom-soft:#FBEDEC; --radius:12px;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  font-size:9pt;font-weight:400;color:var(--ink);background:#fff;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4 portrait;margin:16mm 16mm 18mm 16mm}
.page{width:100%;max-width:180mm;margin:0 auto;padding:0}
.masthead{display:flex;align-items:center;gap:7px;margin-bottom:28px}
.masthead span{font-size:7.5pt;font-weight:700;letter-spacing:.18em;color:var(--gray);text-transform:uppercase}
.cover{padding-bottom:22px;border-bottom:1px solid var(--border);margin-bottom:6px;page-break-inside:avoid}
.cover-kicker{font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);font-weight:700;margin-bottom:10px}
.cover-name{font-size:23pt;font-weight:700;color:var(--navy);letter-spacing:-.015em;margin-bottom:13px}
.cover-meta{display:flex;gap:24px;flex-wrap:wrap;font-size:8pt;color:var(--gray);margin-bottom:15px}
.cover-meta b{color:var(--navy);font-weight:600}
.cover-disc{font-size:7pt;color:var(--gray-soft);line-height:1.65}
.section{margin-top:32px;page-break-inside:avoid}
.section-head{display:flex;align-items:center;gap:8px;margin-bottom:15px}
.section-head .dot{width:5px;height:5px;border-radius:50%;background:var(--blue);flex:0 0 auto}
.section-title{font-size:10.5pt;font-weight:700;color:var(--navy);letter-spacing:-.005em}
.hero-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.hero-stat{border:1px solid rgba(226,233,240,.8);border-radius:var(--radius);padding:17px 16px;
  background:var(--bg-soft);box-shadow:0 1px 2px rgba(22,41,74,.04)}
.hero-stat.accent{background:var(--blue-soft);border-color:rgba(46,111,201,.16)}
.hero-stat.accent.warn{background:var(--amber-soft);border-color:rgba(217,154,43,.18)}
.hs-label{font-size:7pt;text-transform:uppercase;letter-spacing:.05em;color:var(--gray);font-weight:600;margin-bottom:8px}
.hs-val{font-size:16.5pt;font-weight:700;color:var(--navy);letter-spacing:-.01em}
.hero-stat.accent .hs-val{color:var(--blue)}
.hero-stat.accent.warn .hs-val{color:var(--amber)}
.hs-val small{font-size:8.5pt;font-weight:500;color:var(--gray)}
.hs-sub{font-size:7pt;color:var(--gray);margin-top:6px}
.card{background:#fff;border:1px solid rgba(226,233,240,.8);border-radius:var(--radius);
  padding:4px 0;box-shadow:0 1px 2px rgba(22,41,74,.04)}
.kv{display:grid;grid-template-columns:1fr 1fr;background:var(--bg-soft);
  border:1px solid rgba(226,233,240,.8);border-radius:var(--radius);overflow:hidden;
  box-shadow:0 1px 2px rgba(22,41,74,.04)}
.kv.c3{grid-template-columns:1fr 1fr 1fr}
.kc{padding:13px 16px;border-bottom:1px solid var(--border)}
.kl{font-size:7pt;color:var(--gray);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}
.kv2{font-size:10pt;font-weight:700;color:var(--navy)}
.habit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.habit-card{border:1px solid rgba(226,233,240,.8);border-radius:var(--radius);padding:16px 17px;
  background:#fff;box-shadow:0 1px 2px rgba(22,41,74,.04)}
.habit-card .kl{margin-bottom:9px}
.habit-val{font-size:14pt;font-weight:700;color:var(--navy);margin-bottom:10px}
.habit-val small{font-size:8pt;font-weight:500;color:var(--gray)}
.barw{background:var(--border);border-radius:999px;height:5px;overflow:hidden;margin-bottom:9px}
.barf{height:100%;background:linear-gradient(90deg,var(--blue),var(--blue-light));border-radius:999px}
.habit-sub{font-size:7pt;color:var(--gray)}
.chip-list{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;
  background:var(--symptom-soft);border:1px solid rgba(192,82,74,.18)}
.chip-n{font-weight:700;color:var(--symptom);font-size:8.5pt}
.chip-d{font-size:7pt;color:var(--symptom);opacity:.75}
.dt{border:1px solid rgba(226,233,240,.8);border-radius:var(--radius);overflow:hidden;
  box-shadow:0 1px 2px rgba(22,41,74,.04)}
.dt table{width:100%;border-collapse:collapse}
.dt th{font-size:7pt;color:var(--gray);font-weight:700;text-transform:uppercase;letter-spacing:.03em;
  text-align:center;padding:10px 12px;border-bottom:1px solid var(--border)}
.dt th:first-child{text-align:left}
.dt td{font-size:9pt;font-weight:400;padding:11px 12px;border-bottom:1px solid var(--border);color:var(--ink);text-align:center}
.dt td:first-child{text-align:left}
.dt tbody tr:last-child td{border-bottom:none}
.dt tbody tr:nth-child(even){background:var(--bg-soft)}
.pill{display:inline-block;padding:3px 11px;border-radius:999px;font-size:8pt;font-weight:700}
.pill.pos{background:var(--blue-soft);color:var(--blue)}
.pill.neg{background:var(--amber-soft);color:var(--amber)}
.pill.flat{background:var(--bg-soft);color:var(--gray-soft)}
.tl{position:relative;padding-left:16px}
.tl:before{content:"";position:absolute;left:3px;top:2px;bottom:2px;width:1px;background:var(--border)}
.te{position:relative;padding:0 0 13px;page-break-inside:avoid}
.te:before{content:"";position:absolute;left:-13.5px;top:3px;width:5px;height:5px;
  border-radius:50%;background:var(--blue);border:1.5px solid #fff;box-shadow:0 0 0 1px var(--blue)}
.te-d{font-size:7pt;font-weight:700;color:var(--blue)}
.te-t{font-size:8.5pt;font-weight:400;color:var(--ink);margin-top:2px}
.insight{background:var(--blue-soft);border-left:3px solid var(--blue);
  padding:18px 20px;margin-top:32px;border-radius:0 var(--radius) var(--radius) 0;page-break-inside:avoid}
.insight-t{font-size:7pt;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--blue);margin-bottom:9px}
.insight p{font-size:8.5pt;font-weight:400;line-height:1.85;color:var(--ink)}
.ftr{margin-top:34px;padding-top:14px;border-top:1px solid var(--border);
  text-align:center;font-size:7pt;font-weight:400;color:var(--gray-soft);line-height:1.7}
.nota{font-size:7.5pt;color:var(--gray);margin-bottom:10px}
.fab{position:fixed;bottom:18px;right:18px;display:flex;gap:8px;z-index:99}
.fab button{padding:11px 18px;border-radius:12px;border:none;font-family:inherit;
  font-size:11pt;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(22,41,74,.22)}
.fp{background:var(--navy);color:#fff}
.fc{background:#fff;color:var(--navy);border:1px solid var(--border)}
@media print{
  .fab{display:none!important}
  body{background:#fff}
  .section{page-break-inside:avoid}
}
</style>
</head>
<body>
<div class="page">

<div class="masthead">
  <img src="data:image/png;base64,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" width="18" height="18" alt="" style="border-radius:4px;display:block">
  <span>Monity</span>
</div>

<div class="cover">
  <div class="cover-kicker">${cabecalho ? 'Relatório clínico' : 'Relatório de evolução'}</div>
  <div class="cover-name">${reportEsc(p.nome)}</div>
  <div class="cover-meta">
    <span>Período: <b>${reportFmtBRy(ini)} a ${reportFmtBRy(fim)}</b> · ${reportDaysBetween(ini, fim) + 1} dias</span>
    <span>Emitido em: <b>${reportFmtBRy(reportTodayISO())}</b></span>
    ${cabecalhoLinha}
  </div>
  <div class="cover-disc">Este relatório é informativo e não substitui a avaliação do seu médico ou nutricionista. O Monity é um diário pessoal de acompanhamento.</div>
</div>

<div class="section">
  <div class="section-head"><span class="dot"></span><span class="section-title">Resumo executivo</span></div>
  <div class="hero-grid" style="margin-bottom:12px">
    <div class="hero-stat accent"><div class="hs-label">Perdido desde o início</div>
      <div class="hs-val">−${reportNf(reportLost(allWeighings, p))}<small> kg</small></div>
      <div class="hs-sub">${reportNf(reportLostPct(allWeighings, p))}% do peso inicial</div></div>
    <div class="hero-stat accent ${d.varPeso > 0 ? 'warn' : ''}"><div class="hs-label">Variação no período</div>
      <div class="hs-val">${d.varPeso <= 0 ? '−' : '+'}${reportNf(Math.abs(d.varPeso))}<small> kg</small></div></div>
    <div class="hero-stat"><div class="hs-label">Aplicações realizadas</div>
      <div class="hs-val">${d.totalAplicacoesTratamento}</div></div>
  </div>
  <div class="kv c3">
    ${rxSecundario.map(([lbl, val]) => `<div class="kc"><div class="kl">${lbl}</div><div class="kv2">${val}</div></div>`).join('')}
  </div>
</div>

${modulos.aplicacoes ? `<div class="section">
  <div class="section-head"><span class="dot"></span><span class="section-title">Medicação</span></div>
  <div class="kv">
    <div class="kc"><div class="kl">Medicamento</div><div class="kv2">${reportEsc(p.medicamento)}</div></div>
    <div class="kc"><div class="kl">Dose atual</div><div class="kv2">${reportEsc(p.doseAtual)} ${reportEsc(p.unidade)}</div></div>
    <div class="kc"><div class="kl">Frequência</div><div class="kv2">1× por semana</div></div>
    <div class="kc"><div class="kl">Aplicações realizadas</div><div class="kv2">${d.totalAplicacoesTratamento}</div></div>
    <div class="kc"><div class="kl">Última aplicação</div><div class="kv2">${d.lastAppObj ? reportFmtBRy(d.lastAppObj.date) : '—'}</div></div>
    <div class="kc"><div class="kl">Próxima aplicação</div><div class="kv2">${na.days === 0 ? 'Hoje' : REPORT_WD[p.diaAplicacao] + ', ' + reportFmtBRy(na.date)}</div></div>
  </div>
</div>` : ''}

${modulos.peso ? `<div class="section">
  <div class="section-head"><span class="dot"></span><span class="section-title">Evolução do peso</span></div>
  <div class="hero-grid" style="margin-bottom:12px">
    <div class="hero-stat"><div class="hs-label">Início do período</div><div class="hs-val">${reportNf(d.pesoIniPeriod)}<small> kg</small></div></div>
    <div class="hero-stat accent ${d.varPeso > 0 ? 'warn' : ''}"><div class="hs-label">Variação</div>
      <div class="hs-val">${d.varPeso <= 0 ? '−' : '+'}${reportNf(Math.abs(d.varPeso))}<small> kg</small></div></div>
    <div class="hero-stat"><div class="hs-label">Peso atual</div><div class="hs-val">${reportNf(d.pesoFimPeriod)}<small> kg</small></div></div>
  </div>
  ${d.w.length >= 2 ? `<div class="card" style="padding:12px 12px 8px;margin-bottom:13px">${sparkSVG(d.w)}</div>` : ''}
  <div class="kv">
    <div class="kc"><div class="kl">Início do tratamento</div><div class="kv2">${reportFmtBRy(p.dataInicio)}</div></div>
    <div class="kc"><div class="kl">Peso inicial do tratamento</div><div class="kv2">${reportNf(p.pesoInicial)} kg</div></div>
    <div class="kc"><div class="kl">Peso atual</div><div class="kv2">${reportNf(d.pesoFimPeriod)} kg</div></div>
    <div class="kc"><div class="kl">Tempo de tratamento</div><div class="kv2">${reportDaysTreat(p)} dias</div></div>
    <div class="kc"><div class="kl">Peso meta</div><div class="kv2">${reportNf(p.pesoMeta)} kg</div></div>
    <div class="kc"><div class="kl">Falta para a meta</div><div class="kv2">${falta > 0 ? reportNf(falta) + ' kg' : '✓ Meta atingida'}</div></div>
  </div>
</div>` : ''}

${medidasSec()}

${modulos.sintomas && (d.diasTotal > 0 || d.mediaProt > 0) ? `<div class="section">
  <div class="section-head"><span class="dot"></span><span class="section-title">Hábitos do período</span></div>
  <div class="habit-grid">
    ${d.diasTotal > 0 ? `<div class="habit-card">
      <div class="kl">Hidratação</div>
      <div class="habit-val">${reportNf(d.mediaAgua)}<small> L/dia</small></div>
      <div class="barw"><div class="barf" style="width:${Math.min(100, p.metaAgua ? (d.mediaAgua / p.metaAgua) * 100 : 0)}%"></div></div>
      <div class="habit-sub">Meta ${reportNf(p.metaAgua)} L · ${d.metaAguaAtingida} de ${d.diasTotal} dias atingida</div>
    </div>` : ''}
    ${d.mediaProt > 0 ? `<div class="habit-card">
      <div class="kl">Proteína</div>
      <div class="habit-val">${d.mediaProt}<small> g/dia</small></div>
      <div class="barw"><div class="barf" style="width:${Math.min(100, adesaoProt)}%"></div></div>
      <div class="habit-sub">Meta ${p.metaProteina} g · ${adesaoProt}% de adesão</div>
    </div>` : ''}
  </div>
</div>` : ''}

${modulos.sintomas ? `<div class="section">
  <div class="section-head"><span class="dot"></span><span class="section-title">Bem-estar</span></div>
  ${diasHumor.length > 0 ? `<div class="kv" style="margin-bottom:12px">
    ${d.mediaHumor > 0 ? `<div class="kc"><div class="kl">Humor médio</div><div class="kv2">${H[Math.round(d.mediaHumor)] || '—'}</div></div>` : ''}
    ${d.apetiteDom ? `<div class="kc"><div class="kl">Apetite predominante</div><div class="kv2">${d.apetiteDom}</div></div>` : ''}
  </div>` : ''}
  <div class="kl" style="margin-bottom:9px">Sintomas registrados no período</div>
  ${comSint.length === 0 ? '<p class="nota">Nenhum sintoma registrado no período.</p>' : `<div class="chip-list">${comSint.map((s) => `<span class="chip"><span class="chip-n">${s}</span><span class="chip-d">${d.contSint[s]}d</span></span>`).join('')}</div>`}
</div>` : ''}

${bioSec()}

${examesSec()}

${tl.length ? `<div class="section">
  <div class="section-head"><span class="dot"></span><span class="section-title">Linha do tempo</span></div>
  <div class="tl">${tl.map((e) => `
    <div class="te"><div class="te-d">${reportFmtBRy(e.data)}</div><div class="te-t">${e.titulo} — ${e.descricao}</div></div>`).join('')}
  </div>
</div>` : ''}

${modulos.insights && insightsPeriodo && insightsPeriodo.length ? `<div class="section">
    <div class="section-head"><span class="dot"></span><span class="section-title">Insights do período</span></div>
    ${insightsPeriodo.map((i) => `<div class="insight" style="margin-bottom:10px">
      <div class="insight-t">${i.categoria}</div>
      <p>${i.text} <span style="color:var(--gray)">${i.justificativa}</span></p>
    </div>`).join('')}
  </div>` : ''}

${modulos.planoAcao && acoesAlta && acoesAlta.length ? `<div class="section">
    <div class="section-head"><span class="dot"></span><span class="section-title">Plano de acompanhamento</span></div>
    ${acoesAlta.map((a) => `<div class="insight" style="margin-bottom:10px">
      <div class="insight-t">${reportEsc(a.titulo)}</div>
      <p>${reportEsc(a.descricao)} <span style="color:var(--gray)">${reportEsc(a.motivo)}</span></p>
    </div>`).join('')}
  </div>` : ''}

${modulos.planoTerapeutico && planoTerapeutico ? `<div class="section">
    <div class="section-head"><span class="dot"></span><span class="section-title">Plano terapêutico</span></div>
    <div class="kv c3">
      <div class="kc"><div class="kl">Planos ativos</div><div class="kv2">${planoTerapeutico.ativos}</div></div>
      <div class="kc"><div class="kl">Planos concluídos</div><div class="kv2">${planoTerapeutico.concluidos}</div></div>
      <div class="kc"><div class="kl">Taxa de adesão</div><div class="kv2">${planoTerapeutico.adesao != null ? planoTerapeutico.adesao + '%' : '—'}</div></div>
    </div>
  </div>` : ''}

<div class="insight">
  <div class="insight-t">Resumo automático</div>
  <p>${reportGerarResumo(d, ini, fim, p)}</p>
</div>

${assinaturaBloco}

<div class="ftr">Monity · companheiro de tratamento GLP-1<br>Relatório gerado em ${reportFmtBRy(reportTodayISO())} · Este documento não substitui a avaliação do seu médico ou nutricionista.</div>

</div><!-- /page -->

<div class="fab">
  <button class="fc" onclick="window.close()">✕ Fechar</button>
  <button class="fp" onclick="window.print()">⬇ Imprimir / Salvar PDF</button>
</div>
</body>
</html>`;
}

/* ---------- bridge (mesmo padrão de window.__xReady já usado por
   database/auth/insights/timeline/actionplan/notifications — ver
   index.html: window.__reportReady é criado ANTES deste módulo
   carregar, e app.js aguarda essa promise no boot()) ---------- */
const reportApi = {
  coletaDados: reportColetaDados,
  gerarResumo: reportGerarResumo,
  buildPDF: reportBuildPDF,
  achievements: reportAchievements,
};
if (window.__resolveReportReady) window.__resolveReportReady(reportApi);
