import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Compasso Pro',
  description: 'Painel de acompanhamento clínico do Compasso — para nutricionistas e médicos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
