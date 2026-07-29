import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeScript } from '@/components/ThemeScript';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  // 800 cobre os títulos grandes (mesmo peso que .scr-title usa no
  // app do paciente); os demais pesos são o corpo/hierarquia normal.
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Compasso Pro',
  description: 'Painel de acompanhamento clínico do Compasso — para nutricionistas e médicos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-white font-sans dark:bg-navy">{children}</body>
    </html>
  );
}
