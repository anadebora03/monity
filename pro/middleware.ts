import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /* roda em toda rota exceto assets estáticos do Next, favicon e
       /api/* — rotas de API (Sprint Integração Eduzz: /api/eduzz/webhook)
       não têm sessão de cookie (é a Eduzz falando, não uma pessoa
       logada) e cuidam da própria autenticação (assinatura HMAC), não
       do fluxo de login do portal. Sem esta exclusão, updateSession()
       redireciona qualquer POST sem sessão pra /login antes mesmo de
       chegar na rota. */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
