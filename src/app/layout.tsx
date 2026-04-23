import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CNH Quiz — Flashcards Inteligentes',
  description: 'Prepare-se para a prova teórica da CNH com repetição espaçada inteligente, estilo Anki.',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: '#0a0a0a', color: '#f0f0f0', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
