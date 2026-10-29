import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plastic Who? · Auditoría Textil',
    short_name: 'Plastic Who',
    description:
      'Ropa filtrada por lo que realmente está hecha en su etiqueta interna, no por el marketing.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3efe6',
    theme_color: '#191c18',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
