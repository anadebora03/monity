import type { Config } from 'tailwindcss';

/* Tokens portados de style.css (Compasso Paciente), bloco
   :root[data-theme="light"] (linhas ~71-87) — é o tema claro do
   próprio app, não uma paleta nova. O Pro herda exatamente esses
   valores porque "fundo totalmente branco" é literalmente a
   descrição do tema claro que já existe e já foi aprovado. */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#2E6FC9', // --accent (tema claro)
          light: '#4FA0FA', // --accent-light (tema claro)
          deep: '#1F4C8F', // --accent-deep (tema claro)
        },
        ink: {
          DEFAULT: '#0F1D35', // --tx-1 (tema claro)
          soft: 'rgba(15,29,53,.72)', // --tx-2
          faint: 'rgba(15,29,53,.5)', // --tx-3
        },
        good: '#1F9D6B',
        warn: '#C97F1E', // --warn2 (tema claro)
        danger: '#C24A3A', // --danger2 (tema claro)
      },
      backgroundImage: {
        // mesmo gradiente do botão primário do app (.btn-pill), só
        // que em ângulo mais raso pra caber num botão retangular
        // largo em vez de um botão-pílula estreito.
        'accent-gradient': 'linear-gradient(135deg, #4FA0FA 0%, #2E6FC9 100%)',
        'accent-gradient-soft': 'linear-gradient(135deg, rgba(79,160,250,.12) 0%, rgba(46,111,201,.05) 100%)',
        'hero-gradient': 'linear-gradient(160deg, #F4F9FF 0%, #FFFFFF 55%, #F7FAFF 100%)',
      },
      boxShadow: {
        // --sh-glow-sm / --sh-glow-lg / --sh-btn2 (tema claro)
        'glow-sm': '0 0 20px rgba(46,111,201,.18)',
        'glow-lg': '0 0 48px rgba(46,111,201,.14)',
        btn: '0 10px 22px rgba(46,111,201,.22), 0 2px 6px rgba(15,29,53,.08), inset 0 1px 0 rgba(255,255,255,.5)',
        // sombra "quase invisível" pedida pros cards — mesma família
        // de --sh-card2 do tema claro, só bem mais suave (opacidade
        // menor) porque aqui o fundo é branco puro, não um degradê navy.
        card: '0 1px 2px rgba(15,29,53,.04), 0 12px 32px rgba(15,29,53,.06)',
      },
      borderRadius: {
        sm: '14px', // --rd-sm
        md: '20px', // --rd-md
        lg: '24px', // --rd-lg (pedido explícito: 20-24px nos cards)
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.2,.8,.2,1)', // --ease-out
      },
    },
  },
  plugins: [],
};
export default config;
