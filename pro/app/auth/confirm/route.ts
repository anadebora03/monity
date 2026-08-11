import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* Rota de confirmação server-side (Route Handler) — substitui o fluxo
   padrão de code/PKCE pra recuperação de senha.

   Causa raiz do bug em produção: o link do e-mail gerava um `code`
   que só pode ser trocado por sessão no MESMO navegador que chamou
   resetPasswordForEmail() (o code_verifier do PKCE fica salvo no
   localStorage de onde a troca foi pedida). Pedir a recuperação no
   computador e abrir o e-mail no celular — o caso mais comum de
   todos — quebrava a troca instantaneamente.

   verifyOtp() com token_hash não usa o mecanismo de code_verifier do
   PKCE — verifica o token direto contra o Supabase, funciona em
   qualquer navegador/dispositivo. É o padrão recomendado pelo próprio
   Supabase pra recuperação de senha, justamente por causa desse
   problema. Roda no servidor (Route Handler) pra poder gravar o
   cookie de sessão antes do redirect — a página /reset-password então
   já encontra a sessão pronta ao carregar, sem corrida nenhuma.

   IMPORTANTE — depende de trocar o link no template de e-mail do
   Supabase (Authentication -> Email Templates -> Reset Password) pra:
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
   em vez do link padrão (.../auth/v1/verify?...), que é o que gera o
   `code` de PKCE. Sem essa troca no painel, este arquivo nunca é
   chamado. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/reset-password';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect('/reset-password?erro=link_invalido');
}
