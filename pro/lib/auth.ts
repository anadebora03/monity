'use client';

import { createClient } from '@/lib/supabase/client';
import { getAppBaseUrl } from '@/lib/url';

/* Portado de js/auth.js (Monity App) — mesmas mensagens, mesmo
   mapeamento de erro, pra quem usa os dois ambientes ver sempre a
   mesma linguagem. "Reutilizar a arquitetura existente" (pedido
   explícito da Sprint 016) não dá pra ser um import literal (runtime
   diferente — script clássico vs. módulo ES em Next.js), então a
   forma correta de reutilizar aqui é portar o comportamento, não
   inventar um novo. */
function traduzErro(err: unknown): string {
  const anyErr = err as { code?: string; message?: string } | null;
  const code = (anyErr?.code || '').toLowerCase();
  const msg = (anyErr?.message || String(err) || '').toLowerCase();

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed'))
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
    return 'E-mail ou senha incorretos.';
  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists'))
    return 'Este e-mail já está cadastrado.';
  if (code === 'weak_password' || (msg.includes('password') && (msg.includes('short') || msg.includes('6') || msg.includes('weak'))))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code === 'email_address_invalid' || (msg.includes('email') && msg.includes('invalid')))
    return 'Informe um e-mail válido.';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit') || msg.includes('too many'))
    return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch'))
    return 'Sem conexão com o servidor. Verifique sua internet.';
  if (code === 'session_expired' || (msg.includes('session') && msg.includes('expired')))
    return 'Sua sessão expirou. Faça login novamente.';
  return 'Não foi possível concluir. Tente novamente em instantes.';
}

export async function signUp(email: string, password: string, metadata?: Record<string, unknown>) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        // sem isso, o link de confirmação usa a "Site URL" padrão do
        // projeto Supabase (hoje configurada pro app do paciente) e
        // manda o profissional de volta pro lugar errado. Isso exige
        // que essa origem também esteja na allowlist de "Redirect
        // URLs" do painel do Supabase (Authentication -> URL
        // Configuration) — sem isso, o Supabase ignora esse valor e
        // volta a usar a Site URL padrão silenciosamente.
        emailRedirectTo: `${getAppBaseUrl()}/login`,
      },
    });
    if (error) return { ok: false as const, error: traduzErro(error) };
    return { ok: true as const, precisaConfirmarEmail: !data.session };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false as const, error: traduzErro(error) };
    return { ok: true as const, session: data.session };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

export async function signOut() {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false as const, error: traduzErro(error) };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createClient();
  try {
    // AUTH-RESET-01: redirectTo aponta pro path explícito de definir
    // nova senha, não pra raiz do Pro — precisa estar cadastrado nas
    // Redirect URLs do Supabase (Authentication -> URL Configuration)
    // como https://pro.usemonity.com.br/** (ou o domínio configurado
    // em NEXT_PUBLIC_APP_URL), senão o Supabase ignora esse valor.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppBaseUrl()}/reset-password`,
    });
    if (error) return { ok: false as const, error: traduzErro(error) };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

/* Template de e-mail "Reset Password" é compartilhado entre o Monity
   App e o Monity Pro (mesmo projeto Supabase) — usa {{ .RedirectTo }}
   (resolve pro domínio certo em cada app, já que cada um passa seu
   próprio redirectTo acima) + token_hash/type anexados manualmente,
   não o {{ .ConfirmationURL }} padrão, que gera um `code` PKCE preso
   ao navegador que pediu a recuperação (quebra ao abrir o e-mail em
   outro aparelho — o caso mais comum de todos: pedir no computador,
   abrir no celular). verifyOtp com token_hash não tem essa
   limitação. */
export async function verifyRecoveryToken(tokenHash: string) {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    if (error) return { ok: false as const, error: 'Link inválido ou expirado. Peça um novo link de recuperação de senha.' };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

/* Usada em /reset-password, depois que o usuário chega pelo link do
   e-mail — a sessão de recuperação já foi estabelecida por
   verifyRecoveryToken() acima, então updateUser() já opera sobre ela
   sem nenhum passo extra. */
export async function updatePassword(password: string) {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false as const, error: traduzErro(error) };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

export { traduzErro };
