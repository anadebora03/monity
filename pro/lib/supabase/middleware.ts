import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/* Núcleo do middleware.ts (raiz do projeto) — separado aqui pelo
   mesmo motivo de sempre: manter middleware.ts fino, testável e
   fácil de achar. Controle de sessão pedido pela Sprint 016:
     - sem sessão -> só pode ver / (gateway), /login, /cadastro,
       /recuperar-senha; qualquer outra rota redireciona pra /login.
     - com sessão mas sem professional_profiles -> só pode estar em
       /onboarding (é um PACIENTE, ou um profissional que ainda não
       terminou o cadastro) — nunca acessa /pro.
     - com sessão e professional_profiles -> pode acessar /pro/*;
       se tentar voltar pra /login/cadastro, redireciona pra /pro. */
const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/recuperar-senha'];

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
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

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
