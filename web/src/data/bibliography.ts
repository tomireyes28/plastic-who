export interface BibliographyResource {
  id: string;
  type: 'PAPER' | 'DOCUMENTAL' | 'LIBRO' | 'ARTÍCULO';
  title: string;
  authorOrSource: string;
  year?: string;
  summary: string;
  url?: string;
}

/**
 * Bibliografía y fuentes de investigación recopiladas por Aye.
 * Para sumar nuevos elementos del Google Drive, agregalos a esta lista.
 */
export const BIBLIOGRAPHY_ITEMS: BibliographyResource[] = [
  {
    id: 'iucn-microplastics',
    type: 'PAPER',
    title: 'Primary Microplastics in the Oceans: A Global Evaluation of Sources',
    authorOrSource: 'IUCN (Boucher & Friot)',
    year: '2017',
    summary:
      'Estudio clave que demuestra que el lavado de ropa sintética (poliéster, acrílico, poliamida) representa cerca del 35% de los microplásticos primarios liberados en los océanos.',
    url: 'https://portals.iucn.org/library/node/46622',
  },
  {
    id: 'changing-markets-synthetics',
    type: 'PAPER',
    title: 'Synthetics Anonymous: Fashion Brands’ Addiction to Fossil Fuels',
    authorOrSource: 'Changing Markets Foundation',
    year: '2021',
    summary:
      'Investigación sobre cómo más del 60% de las fibras utilizadas por la industria de la moda rápida provienen directamente de combustibles fósiles.',
    url: 'https://changingmarkets.org/',
  },
  {
    id: 'true-cost-doc',
    type: 'DOCUMENTAL',
    title: 'The True Cost',
    authorOrSource: 'Dir. Andrew Morgan',
    year: '2015',
    summary:
      'Documental sobre el impacto ambiental, textil y humano detrás de la transición hacia materiales baratos y sintéticos en la indumentaria moderna.',
  },
  {
    id: 'dermal-exposure-textiles',
    type: 'ESTUDIO' as BibliographyResource['type'],
    title: 'Químicos, disruptores endocrinos y contacto dérmico en fibras sintéticas',
    authorOrSource: 'Carpeta de Investigación — Drive de Aye',
    summary:
      'Espacio reservado para vincular los papers, libros y notas del Google Drive sobre el impacto de las telas sintéticas en contacto con la piel.',
  },
];
