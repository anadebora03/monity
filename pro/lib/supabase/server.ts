import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* Cliente Supabase pro lado do servidor (Server Components, Server
   Actions, Route Handlers) — lê/escreve a sessão via cookies do
   Next.js. Precisa ser criado a cada request (nunca reaproveitado
   como singleton), é o padrão recomendado do @supabase/ssr. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // chamado de um Server Component — o middleware já cuida
            // de renovar a sessão nesse caso, é seguro ignorar aqui.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // ver nota acima
          }
        },
      },
    }
  );
}
