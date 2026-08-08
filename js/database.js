/* ============================================================
   MONITY · Database — sincronização offline-first (Sprint J)
   Camada isolada entre o localStorage (S, em app.js) e o Supabase.
   app.js nunca fala com o Supabase diretamente: só chama os hooks
   expostos aqui via window.__databaseReady, no mesmo padrão de
   ponte já usado por __supabaseReady/__authReady.

   Princípio: localStorage é sempre a fonte imediata (grava antes
   de qualquer rede); o Supabase é a fonte definitiva de
   sincronização entre dispositivos. Nada aqui bloqueia save() —
   toda operação de rede é best-effort e silenciosa quando offline.
   ============================================================ */
import { supabase } from './supabase.js';

const META_KEY = 'compasso_sync_meta_v1';
const MIGRATED_KEY = 'compasso_migrated_v1';
const OWNER_KEY = 'compasso_local_owner_v1';
const DEBOUNCE_MS = 1500;

/* ---------- mapeamento coleção local (S) <-> tabela remota ---------- */
/* unique: coluna usada como alvo do upsert quando o registro não tem
   id próprio (hoje só daily_logs, que é mapeado por data). Demais
   coleções usam o id gerado em app.js (crypto.randomUUID()). */
const COLLECTIONS = {
  weighings:    { table:'weighings',    cols:{peso:'peso',cintura:'cintura',quadril:'quadril',abdomen:'abdomen',coxa:'coxa',braco:'braco'} },
  applications: { table:'applications', cols:{dose:'dose',medicamento:'medicamento',local:'local',obs:'obs'} },
  exams:        { table:'exams',        cols:{tipo:'tipo',valor:'valor'} },
  agenda:       { table:'agenda',       cols:{tipo:'tipo',obs:'obs'} },
  bio:          { table:'bioimpedance', cols:{gordura:'gordura',massaMagraPct:'massa_magra',musculo:'musculo',agua:'agua',visceral:'visceral',tmb:'tmb'} },
};
const PROFILE_COLS = {nome:'nome',medicamento:'medicamento',doseAtual:'dose_atual',unidade:'unidade',diaAplicacao:'dia_aplicacao',dataInicio:'data_inicio',pesoInicial:'peso_inicial',pesoMeta:'peso_meta',altura:'altura',metaAgua:'meta_agua',metaProteina:'meta_proteina',historicalTreatment:'historical_treatment',historicalStartDate:'historical_start_date',historicalApplicationsCount:'historical_applications_count',monityStartDate:'monity_start_date',lastApplicationDate:'last_application_date'};
const PEN_COLS = {capacidadeMg:'capacidade_mg',doseMg:'dose_mg',usadas:'usadas'};
const DAILY_COLS = {agua:'agua',proteina:'proteina',humor:'humor',apetite:'apetite',fomeEmocional:'fome_emocional'};

let host = null; // {getState(), applyRemote(mutatorFn)} — fornecido por app.js em init()
let userId = null;
let debounceTimer = null;
let syncing = false;
/* Permissão de sincronizar (Sprint P — licenciamento). database.js nunca
   verifica plano — só recebe um booleano já decidido de app.js (o único
   lugar que fala com js/license.js) via setSyncAllowed(). Começa true:
   até a licença carregar, nada aqui deve regredir por acidente. Único
   ponto de checagem: syncNow()/migrateIfNeeded(), os dois chokepoints
   por onde TODO caminho de sync passa (onLocalSave, listeners de
   online/visibilitychange, e o pós-login) — gatear aqui, não em cada
   gatilho separado, é o que garante que nenhum caminho escape. */
let syncAllowed = true;
function setSyncAllowed(v){ syncAllowed = !!v; }

function loadMeta(){ try{ return JSON.parse(localStorage.getItem(META_KEY)) || {}; }catch(e){ return {}; } }
function saveMeta(m){ try{ localStorage.setItem(META_KEY, JSON.stringify(m)); }catch(e){} }

function toRow(cols, obj){
  const row = {};
  for(const [local, remote] of Object.entries(cols)){
    if(obj[local] !== undefined) row[remote] = obj[local];
  }
  return row;
}
function fromRow(cols, row){
  const obj = {};
  for(const [local, remote] of Object.entries(cols)){
    if(row[remote] !== undefined && row[remote] !== null) obj[local] = row[remote];
  }
  return obj;
}

/* ---------- push com resolução de conflito por updated_at real ----------
   meta[coleção][chave] = {fp, at}: fp é o fingerprint do conteúdo local já
   confirmado no servidor da última vez; at é o updated_at do servidor
   naquele momento (definido pelo trigger set_updated_at() do banco, nunca
   pelo relógio do cliente).

   Antes de sobrescrever um registro que já sincronizamos antes, comparamos
   o updated_at ATUAL do servidor com o que guardamos em `at`. Se mudou,
   alguém (outro dispositivo, ou este mesmo depois de ficar offline) já
   escreveu uma versão mais nova desde a nossa última sincronização — essa
   versão vence, e a edição local desatualizada não é enviada. Registros
   nunca antes sincronizados (sem entrada em meta) não têm com o que
   conflitar: vão direto para o upsert. */
async function pushRecord(table, match, row, fingerprint, known, mapRow){
  if(known){
    const {data:current} = await supabase.from(table).select('updated_at').match(match).maybeSingle();
    if(current && current.updated_at && current.updated_at !== known.at){
      const {data:full} = await supabase.from(table).select('*').match(match).maybeSingle();
      if(full){
        return {conflict:true, remote:full, meta:{fp:JSON.stringify(mapRow(full)), at:full.updated_at}};
      }
    }
  }
  const onConflict = Object.keys(match).join(',');
  const {data:written, error} = await supabase.from(table).upsert(row, {onConflict}).select('updated_at').maybeSingle();
  if(error){ console.error(`[Sync] falha ao enviar ${table}:`, error.message); return null; }
  return {conflict:false, meta:{fp:fingerprint, at: written&&written.updated_at}};
}

async function pushCollection(name){
  const cfg = COLLECTIONS[name];
  const S = host.getState();
  const records = S[name] || [];
  const meta = loadMeta();
  const seen = meta[name] || {};
  let changed = false;
  for(const rec of records){
    if(!rec.id) continue; // segurança: registros sem id (legado) não são sincronizados ainda
    const fingerprint = JSON.stringify(rec);
    const known = seen[rec.id];
    if(known && known.fp === fingerprint) continue; // nada mudou desde o último sync bem-sucedido
    const row = {id:rec.id, user_id:userId, date:rec.date, ...toRow(cfg.cols, rec)};
    const mapRow = full=>({id:full.id, date:full.date, ...fromRow(cfg.cols, full)});
    const result = await pushRecord(cfg.table, {id:rec.id}, row, fingerprint, known, mapRow);
    if(!result) continue;
    if(result.conflict){
      host.applyRemote(S2=>{
        const idx = S2[name].findIndex(r=>r.id===rec.id);
        const merged = mapRow(result.remote);
        if(idx>=0) S2[name][idx]=merged; else S2[name].push(merged);
        return S2;
      });
    }
    seen[rec.id] = result.meta; changed = true;
  }
  if(changed){ meta[name] = seen; saveMeta(meta); }
}
async function pushProfile(){
  const S = host.getState();
  if(!S.profile) return;
  const meta = loadMeta();
  const fingerprint = JSON.stringify(S.profile);
  const known = meta.profile;
  if(known && known.fp === fingerprint) return;
  // deleted_at:null explícito — reviver a linha se ela tiver sido
  // soft-deletada por wipeServerData() ("Começar novamente", Auditoria
  // Sprint 01); sem isso, o próximo pullProfile() (que agora filtra
  // deleted_at) nunca mais encontraria essa conta.
  const row = {id:userId, ...toRow(PROFILE_COLS, S.profile), deleted_at:null};
  const mapRow = full=>fromRow(PROFILE_COLS, full);
  const result = await pushRecord('profiles', {id:userId}, row, fingerprint, known, mapRow);
  if(!result) return;
  if(result.conflict){
    host.applyRemote(S2=>{ S2.profile = {...S2.profile, ...mapRow(result.remote)}; return S2; });
  }
  meta.profile = result.meta; saveMeta(meta);
}
async function pushPen(){
  const S = host.getState();
  if(!S.pen || !S.pen.id) return;
  const meta = loadMeta();
  const fingerprint = JSON.stringify(S.pen);
  const known = meta.pen;
  if(known && known.fp === fingerprint) return;
  const row = {id:S.pen.id, user_id:userId, ...toRow(PEN_COLS, S.pen)};
  const mapRow = full=>({id:full.id, ...fromRow(PEN_COLS, full)});
  const result = await pushRecord('pens', {id:S.pen.id}, row, fingerprint, known, mapRow);
  if(!result) return;
  if(result.conflict){
    host.applyRemote(S2=>{ S2.pen = mapRow(result.remote); return S2; });
  }
  meta.pen = result.meta; saveMeta(meta);
}
async function pushDailyLogs(){
  const S = host.getState();
  const logs = S.dailyLogs || {};
  const meta = loadMeta();
  const seen = meta.dailyLogs || {};
  let changed = false;
  for(const [date, log] of Object.entries(logs)){
    const fingerprint = JSON.stringify(log);
    const known = seen[date];
    if(known && known.fp === fingerprint) continue;
    const row = {
      user_id:userId, date,
      ...toRow(DAILY_COLS, log),
      sintomas: log.sintomas || [],
      exercicios: log.exercicios || [],
      protein_sources: log.prot || null,
    };
    const mapRow = full=>({
      ...fromRow(DAILY_COLS, full),
      sintomas: full.sintomas || [], exercicios: full.exercicios || [], prot: full.protein_sources || null,
    });
    const result = await pushRecord('daily_logs', {user_id:userId, date}, row, fingerprint, known, mapRow);
    if(!result) continue;
    if(result.conflict){
      host.applyRemote(S2=>{
        if(!S2.dailyLogs) S2.dailyLogs = {};
        S2.dailyLogs[date] = {...(S2.dailyLogs[date]||{}), ...mapRow(result.remote)};
        return S2;
      });
    }
    seen[date] = result.meta; changed = true;
  }
  if(changed){ meta.dailyLogs = seen; saveMeta(meta); }
}

async function pushAll(){
  if(!userId) return; // mutuamente exclusivo via withSyncLock() no chamador — não checar `syncing` aqui
  await pushProfile();
  await pushPen();
  await pushDailyLogs();
  for(const name of Object.keys(COLLECTIONS)) await pushCollection(name);
}

/* ---------- pull: traz do servidor só o que mudou desde o último pull ----------
   Depois de aplicar cada linha localmente, também atualizamos meta[coleção][chave]
   = {fp, at} com o estado recém-puxado. Sem isso, o próximo push veria um
   fingerprint local diferente do que tinha guardado (porque acabamos de mudar o
   local via pull) e concluiria — errado — que havia um conflito consigo mesmo. */
async function pullCollection(name){
  const cfg = COLLECTIONS[name];
  const meta = loadMeta();
  const seen = meta[name] || {};
  const since = meta['pull_'+name] || '1970-01-01T00:00:00Z';
  // sem .is('deleted_at', null) aqui de propósito: um registro soft-deletado
  // também tem updated_at novo (o UPDATE que gravou deleted_at) e PRECISA
  // aparecer nesta busca incremental, senão nenhum dispositivo que já tinha
  // puxado esse registro antes fica sabendo que ele foi apagado — ele
  // simplesmente some da query e nunca é removido do S[name] local.
  const {data, error} = await supabase.from(cfg.table)
    .select('*').eq('user_id', userId).gt('updated_at', since)
    .order('updated_at', {ascending:true});
  if(error){ console.error(`[Sync] falha ao buscar ${name}:`, error.message); return; }
  if(!data || !data.length) return;
  host.applyRemote(S=>{
    const byId = new Map(S[name].map(r=>[r.id, r]));
    for(const row of data){
      if(row.deleted_at){ byId.delete(row.id); seen[row.id] = {fp:'__deleted__', at:row.updated_at}; continue; }
      const rec = {id:row.id, date:row.date, ...fromRow(cfg.cols, row)};
      byId.set(row.id, rec);
      seen[row.id] = {fp:JSON.stringify(rec), at:row.updated_at};
    }
    S[name] = Array.from(byId.values());
    return S;
  });
  meta[name] = seen;
  meta['pull_'+name] = data[data.length-1].updated_at;
  saveMeta(meta);
}
async function pullProfile(){
  // sem .is('deleted_at', null) na query, pelo mesmo motivo de
  // pullCollection(): precisamos SABER quando o servidor diz "apagado"
  // pra zerar o S.profile local, não só deixar de atualizá-lo.
  const {data, error} = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if(error) return;
  const meta = loadMeta();
  if(!data || data.deleted_at){
    // !data: usuário nunca onboardou no servidor ainda — não mexe no
    // local (pode ter onboarding local pendente de push). data.deleted_at:
    // wipeServerData() apagou o perfil (reset) — aí sim zeramos, senão
    // o perfil "resetado" volta a aparecer neste ou noutro dispositivo.
    if(data && data.deleted_at){
      host.applyRemote(S=>{ S.profile = null; return S; });
      meta.profile = null;
      saveMeta(meta);
    }
    return;
  }
  host.applyRemote(S=>{
    S.profile = {...S.profile, ...fromRow(PROFILE_COLS, data)};
    meta.profile = {fp:JSON.stringify(S.profile), at:data.updated_at};
    return S;
  });
  saveMeta(meta);
}
async function pullPen(){
  const {data, error} = await supabase.from('pens').select('*').eq('user_id', userId).maybeSingle();
  if(error || !data) return;
  const meta = loadMeta();
  if(data.deleted_at){
    host.applyRemote(S=>{ S.pen = {capacidadeMg:0, doseMg:0, usadas:0}; return S; });
    meta.pen = null;
    saveMeta(meta);
    return;
  }
  host.applyRemote(S=>{
    S.pen = {id:data.id, ...fromRow(PEN_COLS, data)};
    meta.pen = {fp:JSON.stringify(S.pen), at:data.updated_at};
    return S;
  });
  saveMeta(meta);
}
async function pullDailyLogs(){
  const meta = loadMeta();
  const seen = meta.dailyLogs || {};
  const since = meta.pull_dailyLogs || '1970-01-01T00:00:00Z';
  // sem .is('deleted_at', null) — mesmo motivo de pullCollection().
  const {data, error} = await supabase.from('daily_logs')
    .select('*').eq('user_id', userId).gt('updated_at', since)
    .order('updated_at', {ascending:true});
  if(error || !data || !data.length) return;
  host.applyRemote(S=>{
    if(!S.dailyLogs) S.dailyLogs = {};
    for(const row of data){
      if(row.deleted_at){ delete S.dailyLogs[row.date]; seen[row.date] = {fp:'__deleted__', at:row.updated_at}; continue; }
      S.dailyLogs[row.date] = {
        ...(S.dailyLogs[row.date]||{}),
        ...fromRow(DAILY_COLS, row),
        sintomas: row.sintomas || [],
        exercicios: row.exercicios || [],
        prot: row.protein_sources || (S.dailyLogs[row.date]&&S.dailyLogs[row.date].prot),
      };
      seen[row.date] = {fp:JSON.stringify(S.dailyLogs[row.date]), at:row.updated_at};
    }
    meta.dailyLogs = seen;
    return S;
  });
  const latest = data[data.length-1].updated_at;
  meta.pull_dailyLogs = latest;
  saveMeta(meta);
}

async function pullAll(){
  if(!userId) return;
  await pullProfile();
  await pullPen();
  await pullDailyLogs();
  for(const name of Object.keys(COLLECTIONS)) await pullCollection(name);
}

/* ---------- migração automática (primeiro login com banco vazio) ---------- */
async function migrateIfNeeded(){
  if(!userId || !syncAllowed) return;
  // dispositivo reaproveitado por outra conta: descarta o estado local
  // residual (nunca era desta conta) ANTES de qualquer outra decisão —
  // não só quando o servidor está vazio (Auditoria Sprint 01, achado
  // 18-3: bastava a conta nova já ter dado no servidor pra pular direto
  // pro merge do pullProfile() por cima do estado antigo, sem nunca
  // zerar S primeiro).
  let owner = null;
  try{ owner = localStorage.getItem(OWNER_KEY); }catch(e){}
  if(owner && owner !== userId){
    if(host && host.resetLocal) host.resetLocal();
    try{ localStorage.setItem(OWNER_KEY, userId); localStorage.removeItem(MIGRATED_KEY); }catch(e){}
    return; // nada a migrar: acabamos de zerar S; pullAll() (syncNow(), chamado
            // em seguida por setUser()) traz o que existir no servidor pra esta conta
  }
  try{ if(localStorage.getItem(MIGRATED_KEY) === userId) return; }catch(e){}
  const {count, error} = await supabase.from('profiles').select('id', {count:'exact', head:true}).eq('id', userId);
  if(error) return; // sem rede/erro: tenta de novo no próximo boot, não bloqueia o app
  if(count && count > 0){
    // já existe conta com dados no servidor (login em outro dispositivo, ou já migrado antes) — não migra, só sincroniza normalmente
    try{ localStorage.setItem(MIGRATED_KEY, userId); localStorage.setItem(OWNER_KEY, userId); }catch(e){}
    return;
  }
  const S = host.getState();
  if(!S || !S.profile){ try{ localStorage.setItem(OWNER_KEY, userId); }catch(e){} return; } // usuário ainda não passou pelo onboarding local — nada para migrar
  await withSyncLock(pushAll);
  try{ localStorage.setItem(MIGRATED_KEY, userId); localStorage.setItem(OWNER_KEY, userId); }catch(e){}
}

/* ---------- reset real ("Começar novamente") ----------
   Auditoria Sprint 01, achado 18-1: confirmarResetAll() (app.js) só
   limpava o estado local — o Supabase nunca era tocado, então o próximo
   syncNow() trazia tudo de volta. Soft-delete (deleted_at) em todas as
   tabelas do usuário, reaproveitando exatamente o mecanismo já usado
   pra sincronização incremental (pullCollection()/pullPen()/
   pullDailyLogs() já ignoram deleted_at!=null) — só profiles precisou
   ganhar o mesmo filtro (ver pullProfile()). Não precisa de policy de
   DELETE nova: é um UPDATE, e "update_own" já autoriza o dono a
   escrever deleted_at nas próprias linhas. Melhor esforço, mesmo
   princípio de sincronização silenciosa quando offline já documentado
   no topo do arquivo — se falhar, o estado local ainda é limpo. */
async function wipeServerData(){
  if(!userId) return false;
  const nowISO = new Date().toISOString();
  let ok = true;
  try{
    const ops = Object.values(COLLECTIONS).map(cfg=>
      supabase.from(cfg.table).update({deleted_at:nowISO}).eq('user_id', userId).is('deleted_at', null));
    ops.push(supabase.from('pens').update({deleted_at:nowISO}).eq('user_id', userId).is('deleted_at', null));
    ops.push(supabase.from('daily_logs').update({deleted_at:nowISO}).eq('user_id', userId).is('deleted_at', null));
    ops.push(supabase.from('profiles').update({deleted_at:nowISO}).eq('id', userId).is('deleted_at', null));
    const results = await Promise.all(ops);
    ok = results.every(r=>!r.error);
  }catch(e){
    console.error('[Sync] wipeServerData falhou (melhor esforço):', e);
    ok = false;
  }
  // limpa o rastro de sincronização local mesmo se o wipe do servidor
  // falhar parcialmente (ex.: offline) — sem isso, o próximo pushProfile()
  // do onboarding novo poderia cair no caminho de "conflito" de
  // pushRecord() e reviver campos antigos da conta antes do reset.
  try{ localStorage.removeItem(META_KEY); }catch(e){}
  return ok;
}

/* ---------- orquestração ----------
   syncing é um mutex compartilhado por migrateIfNeeded() e syncNow(): os dois
   fazem leitura+escrita do mesmo meta em localStorage, então nunca podem
   rodar ao mesmo tempo — senão a gravação mais lenta sobrescreve a mais
   nova e o rastreamento de "o que já foi enviado" fica errado. */
async function withSyncLock(fn){
  if(syncing) return;
  syncing = true;
  try{ await fn(); }
  catch(e){ console.error('[Sync] erro inesperado:', e); }
  finally{ syncing = false; }
}
function scheduleSync(){
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>{ syncNow(); }, DEBOUNCE_MS);
}
async function syncNow(){
  if(!userId || !navigator.onLine || !syncAllowed) return;
  await withSyncLock(async ()=>{ await pushAll(); await pullAll(); });
}

function onLocalSave(){
  scheduleSync();
}

let listenersBound = false;
function init({getState, applyRemote, resetLocal}){
  host = {getState, applyRemote, resetLocal};
  if(!listenersBound){
    listenersBound = true;
    window.addEventListener('online', syncNow);
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') syncNow(); });
  }
}
/* Chamado sempre que a sessão muda (login, boot com sessão ativa, logout).
   uid=null (logout) só interrompe a sincronização aqui — quem limpa o
   estado local (S) e o localStorage no logout é o handler SIGNED_OUT em
   app.js (Auditoria Sprint 01, achado 18-1/9: antes disso, nada limpava
   nada no logout). */
function setUser(uid){
  clearTimeout(debounceTimer);
  userId = uid;
  if(!uid || !host) return Promise.resolve();
  // devolve a cadeia completa migrateIfNeeded() → syncNow(): a
  // primeira só decide SE deve migrar; quem de fato busca e aplica o
  // perfil no S local é pullProfile(), dentro de syncNow(). Devolver
  // só migrateIfNeeded() (como era antes) fazia quem chama achar que
  // já podia confiar em S.profile sem ele ainda ter chegado — exatamente
  // a causa do onboarding "piscar e sumir sozinho" pra contas que já
  // tinham cadastro: app.js fazia `await DB.setUser(...)` esperando
  // pouco tempo demais, e o render() seguinte via S ainda vazio.
  return migrateIfNeeded().then(syncNow);
}

const dbApi = {init, onLocalSave, syncNow, setUser, setSyncAllowed, wipeServerData};

if(window.__resolveDatabaseReady) window.__resolveDatabaseReady(dbApi);
else window.__databaseReady = Promise.resolve(dbApi);

export { supabase };
