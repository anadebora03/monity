/* ============================================================
   MONITY · Config — configurações públicas do projeto
   Único lugar responsável por guardar SUPABASE_URL e
   SUPABASE_ANON_KEY. Substitua pelos dados do seu projeto.
   ============================================================ */
export const SUPABASE_URL = 'https://bbhvtrpkdltjwjyskjli.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiaHZ0cnBrZGx0andqeXNramxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTQ4OTMsImV4cCI6MjA5OTE5MDg5M30.rqd-9bRYTBhwGpNH5IBrGJihaa7iMqjlXywEauvRJxk';

/* URL pública canônica do app do paciente — usada em redirectTo de
   e-mails de auth (recuperação de senha). App zero-build, sem env
   vars/bundler, então a distinção dev/produção é feita pelo hostname
   em vez de uma variável de ambiente (mesmo princípio do
   getAppBaseUrl() do Monity Pro, pro/lib/url.ts). Em localhost/127.0.0.1
   (dev de verdade) usa a origem atual; em qualquer outro host —
   inclusive um domínio antigo/preview esquecido em algum bookmark —
   força o domínio oficial, nunca deixa vazar pra fora dele. */
export const APP_URL = (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  ? location.origin
  : 'https://app.usemonity.com.br';
