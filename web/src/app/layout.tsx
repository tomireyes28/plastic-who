import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plastic Who? | Ropa por su composición real',
  description:
    'Explorá y filtrá el catálogo de marcas de ropa argentinas según el porcentaje de fibras naturales, semisintéticas y sintéticas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
