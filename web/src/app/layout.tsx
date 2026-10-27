import type { Metadata } from 'next';
import { DM_Sans, Fraunces, Space_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Plastic Who? — Archivo y Auditoría Textil',
  description:
    'Ropa filtrada por lo que realmente está hecha, no por lo que dice la etiqueta de marketing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${dmSans.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen antialiased selection:bg-[#2A4B38] selection:text-[#F6F3EC]">
        {children}
      </body>
    </html>
  );
}
