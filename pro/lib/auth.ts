'use client';

import { createClient } from '@/lib/supabase/client';

/* Portado de js/auth.js (Compasso Paciente) — mesmas mensagens, mesmo
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
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    if (error) return { ok: false as const, error: traduzErro(error) };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: traduzErro(e) };
  }
}

export { traduzErro };
