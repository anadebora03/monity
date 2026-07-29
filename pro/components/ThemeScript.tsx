/* Roda antes da hidratação (mesmo princípio do tema do app do
   paciente: decidir o tema ANTES do primeiro render evita o "flash"
   de tela clara antes de trocar pra escura). Chave própria do Pro
   (compasso_pro_theme), não compartilha localStorage com o app do
   paciente — são domínios/origens diferentes, não haveria como
   compartilhar mesmo se quisesse. */
const THEME_SCRIPT = `
(function(){
  try {
    var stored = localStorage.getItem('compasso_pro_theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
