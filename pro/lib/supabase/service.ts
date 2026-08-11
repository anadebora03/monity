import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/* Cliente com a service role key — bypassa RLS por completo. Único
   lugar do projeto que usa essa chave (Sprint Integração Eduzz): o
   webhook da Eduzz fala com o Monity sem nenhuma sessão de usuário
   (não é uma pessoa logada, é a Eduzz), então precisa de um cliente
   que consiga achar/criar dado de QUALQUER usuário — nenhuma policy
   de RLS existente cobre esse caso, de propósito (nunca deveria dar
   pra um usuário comum fazer isso).

   NUNCA importar este arquivo em código que roda no browser (client
   component) — a service role key destrava tudo. Só é seguro aqui
   porque route handlers do Next.js (arquivos route.ts dentro de
   app/api) rodam inteiramente no servidor. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_URL) não configurada.');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
