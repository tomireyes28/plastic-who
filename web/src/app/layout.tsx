import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  themeColor: '#191c18',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://plasticwho.com'),
  title: 'Plastic Who? — Archivo y Auditoría Textil',
  description:
    'Ropa filtrada por lo que realmente está hecha en su etiqueta interna, no por el marketing.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Plastic Who? — Archivo y Auditoría Textil',
    description:
      'Filtrá ropa por composición real de fibras (algodón, lino, lana, viscosa, poliéster) en tiendas argentinas.',
    url: 'https://plasticwho.com',
    siteName: 'Plastic Who?',
    locale: 'es_AR',
    type: 'website',
  },
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
