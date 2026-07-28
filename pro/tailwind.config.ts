import type { Config } from 'tailwindcss';

/* Paleta emprestada do token --accent do Compasso Paciente (style.css)
   pra manter a mesma identidade de marca entre os dois ambientes,
   adaptada pra um painel claro (o paciente é navy escuro; o Pro é
   majoritariamente desktop/diurno). */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#2E6FC9',
          light: '#4FA0FA',
          deep: '#1F4C8F',
        },
        ink: {
          DEFAULT: '#0F1D35',
          soft: 'rgba(15,29,53,.72)',
          faint: 'rgba(15,29,53,.5)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
