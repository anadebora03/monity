import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/* Núcleo do middleware.ts (raiz do projeto) — separado aqui pelo
   mesmo motivo de sempre: manter middleware.ts fino, testável e
   fácil de achar. Controle de sessão pedido pela Sprint 016:
     - sem sessão -> só pode ver / (gateway), /login, /cadastro,
       /recuperar-senha, /convite/*; qualquer outra rota redireciona
       pra /login.
     - com sessão mas sem professional_profiles -> só pode estar em
       /onboarding (é um PACIENTE, ou um profissional que ainda não
       terminou o cadastro) — nunca acessa /pro.
     - com sessão e professional_profiles -> pode acessar /pro/*;
       se tentar voltar pra /login/cadastro, redireciona pra /pro.
   /convite/* (Sprint 018) fica público em qualquer estado de sessão
   de propósito: é a única rota que precisa funcionar tanto pra quem
   não tem conta ainda quanto pra quem já tem — a própria página
   decide o que mostrar. */
const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/recuperar-senha'];
const PUBLIC_PREFIXES = ['/convite/'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  // só /convite/* fica de fora do resto da lógica mesmo autenticado —
  // as outras rotas públicas (/login, /cadastro...) continuam sujeitas
  // ao redirecionamento de quem já é profissional, exatamente como antes.
  const isAlwaysPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAlwaysPublic) return response;

  // autenticado — descobre se já é um profissional com cadastro completo.
  const { data: professional } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  const isProfessional = !!professional;

  if (!isProfessional && path.startsWith('/pro')) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  if (isProfessional && (path === '/login' || path === '/cadastro' || path === '/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/pro';
    return NextResponse.redirect(url);
  }

  return response;
}
