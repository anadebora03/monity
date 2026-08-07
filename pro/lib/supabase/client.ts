import { createBrowserClient } from '@supabase/ssr';

/* Cliente Supabase pro lado do navegador (Client Components). Mesmo
   projeto/URL/anon key do Monity App (js/config.js na raiz) —
   um backend só, dois frontends, nenhuma chave nova. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
