import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plastic Who? — Archivo y Auditoría Textil',
    short_name: 'Plastic Who?',
    description:
      'Ropa filtrada por su composición real de fibras naturales, semisintéticas y sintéticas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3efe6',
    theme_color: '#191c18',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
