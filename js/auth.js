/* ============================================================
   MONITY · Auth — Supabase Auth
   Cadastro, login, logout, recuperação de senha e sessão.
   Carregado como módulo; expõe as funções para o app.js (script
   clássico) via window.__authReady, no mesmo padrão da ponte
   já usada por window.__supabaseReady em js/supabase.js.
   ============================================================ */
import { supabase } from './supabase.js';

function traduzErro(err){
  const code = (err && err.code || '').toLowerCase();
  const msg = ((err && err.message) || String(err) || '').toLowerCase();
  if(code==='email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if(code==='invalid_credentials' || msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if(code==='user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) return 'Este e-mail já está cadastrado.';
  if(code==='weak_password' || (msg.includes('password') && (msg.includes('short') || msg.includes('6') || msg.includes('weak')))) return 'A senha precisa ter pelo menos 6 caracteres.';
  if(code==='email_address_invalid' || (msg.includes('email') && msg.includes('invalid'))) return 'Informe um e-mail válido.';
  if(code==='over_email_send_rate_limit' || msg.includes('rate limit') || msg.includes('too many')) return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  if(msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return 'Sem conexão com o servidor. Verifique sua internet.';
  if(code==='session_expired' || (msg.includes('session') && msg.includes('expired'))) return 'Sua sessão expirou. Faça login novamente.';
  return 'Não foi possível concluir. Tente novamente em instantes.';
}

export async function signUp(email,password){
  try{
    const {data,error}=await supabase.auth.signUp({email,password});
    if(error) return {ok:false,error:traduzErro(error)};
    return {ok:true,precisaConfirmarEmail:!data.session};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

export async function signIn(email,password){
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error) return {ok:false,error:traduzErro(error)};
    return {ok:true,session:data.session};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

export async function signOut(){
  try{
    const {error}=await supabase.auth.signOut();
    if(error) return {ok:false,error:traduzErro(error)};
    return {ok:true};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

export async function resetPasswordForEmail(email){
  try{
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    if(error) return {ok:false,error:traduzErro(error)};
    return {ok:true};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

/* Usada tanto na tela de definir nova senha (após clicar no link de
   recuperação) quanto na troca de senha estando logado em
   Configurações — é o mesmo updateUser({password}) do Supabase nos
   dois casos, a única diferença é o chamador confirmar a senha atual
   antes, via reauthenticate(), quando o usuário já está logado. */
export async function updatePassword(password){
  try{
    const {error}=await supabase.auth.updateUser({password});
    if(error) return {ok:false,error:traduzErro(error)};
    return {ok:true};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

/* Confirma a senha atual antes de uma troca sensível (e-mail/senha)
   estando logado — supabase.auth.updateUser() não exige a senha
   atual por padrão, então validamos manualmente refazendo o login
   com a senha informada (mesma sessão do usuário, não desloga
   ninguém). */
export async function reauthenticate(password){
  try{
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError || !user || !user.email) return {ok:false,error:'Sessão inválida. Faça login novamente.'};
    const {error}=await supabase.auth.signInWithPassword({email:user.email,password});
    if(error) return {ok:false,error:'Senha atual incorreta.'};
    return {ok:true};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

/* Troca de e-mail: o Supabase envia confirmação pros dois endereços
   (atual e novo) quando "Confirm email change" está ligado no
   projeto — o e-mail só muda de verdade depois da confirmação, então
   o retorno aqui é sempre "confirmação enviada", não "já trocou". */
export async function updateEmail(email){
  try{
    const {error}=await supabase.auth.updateUser({email});
    if(error) return {ok:false,error:traduzErro(error)};
    return {ok:true};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

export function onAuthStateChange(cb){
  return supabase.auth.onAuthStateChange(cb);
}

/* Apaga a CONTA em si (auth.users), não só os dados do tratamento —
   diferente do "Excluir todos os dados" (que é um reset via
   DB.wipeServerData()). delete_own_account() é uma função Postgres
   SECURITY DEFINER (supabase/schema_delete_account.sql) — o cliente
   nunca tem permissão direta pra apagar de auth.users, só a função
   rodando com privilégio elevado consegue, e só a linha do próprio
   auth.uid() (checado dentro da função, nunca confia num id vindo do
   cliente). Cascata (on delete cascade, já existente em todas as
   tabelas do paciente) apaga profile/pesagens/aplicações/etc. junto. */
export async function deleteAccount(){
  try{
    const {error}=await supabase.rpc('delete_own_account');
    if(error) return {ok:false,error:traduzErro(error)};
    const {error:signOutError}=await supabase.auth.signOut();
    if(signOutError) return {ok:false,error:traduzErro(signOutError)};
    return {ok:true};
  }catch(e){ return {ok:false,error:traduzErro(e)}; }
}

export { supabase };

const authApi={signUp,signIn,signOut,resetPasswordForEmail,updatePassword,updateEmail,reauthenticate,onAuthStateChange,deleteAccount};
if(window.__resolveAuthReady) window.__resolveAuthReady(authApi);
else window.__authReady=Promise.resolve(authApi);
