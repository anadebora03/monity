/* Sprint 3.3 — resolução centralizada da URL pública do Monity Pro.
   Achado do TESTE A: o link de convite era montado com
   window.location.origin (InviteModal.tsx), então em produção saía
   apontando pro domínio de onde a página foi carregada — que nesta
   sessão era localhost:3001 (dev), mas em qualquer ambiente onde o
   profissional acessa por um domínio "errado" (preview do Vercel,
   proxy, etc.) geraria o mesmo problema. Único ponto de decisão desta
   URL — nenhum outro arquivo deve montar link de convite sozinho.

   Ordem de prioridade:
   1. NEXT_PUBLIC_APP_URL — configurado explicitamente (produção real).
   2. VERCEL_URL — injetado automaticamente pelo Vercel em toda build
      (preview ou produção); cobre deploys que ainda não têm o env var
      customizado configurado.
   3. window.location.origin — só em contexto de navegador (client
      component) sem os dois acima, aceitável em dev local.
   4. fallback fixo de dev, só quando nada mais está disponível
      (execução no servidor sem os env vars, ex.: build local). */
export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  if (typeof window !== 'undefined') return window.location.origin;

  return 'http://localhost:3001';
}
