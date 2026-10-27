export type FiberCategory = 'NATURAL' | 'SEMISYNTHETIC' | 'SYNTHETIC';

export interface FiberDefinition {
  canonicalName: string;
  category: FiberCategory;
  synonyms: string[];
}

export const FIBER_DICTIONARY: FiberDefinition[] = [
  // ========================
  // FIBRAS NATURALES
  // ========================
  {
    canonicalName: 'algodón',
    category: 'NATURAL',
    synonyms: [
      'algodon pima',
      'algodón pima',
      'algodon organico',
      'algodón orgánico',
      'algodon peinado',
      'algodón peinado',
      'algodon',
      'algodón',
      'cotton',
    ],
  },
  {
    canonicalName: 'lino',
    category: 'NATURAL',
    synonyms: ['lino', 'linen'],
  },
  {
    canonicalName: 'ramié',
    category: 'NATURAL',
    synonyms: ['ramie', 'ramié', 'ramio'],
  },
  {
    canonicalName: 'lana',
    category: 'NATURAL',
    synonyms: [
      'lana merino',
      'lana virgen',
      'lana oveja',
      'lana',
      'merino',
      'mohair',
      'alpaca',
      'cashmere',
      'cachemira',
      'wool',
    ],
  },
  {
    canonicalName: 'seda',
    category: 'NATURAL',
    synonyms: ['seda natural', 'seda', 'silk'],
  },
  {
    canonicalName: 'cáñamo',
    category: 'NATURAL',
    synonyms: ['cañamo', 'cáñamo', 'canamo', 'hemp'],
  },
  {
    canonicalName: 'yute',
    category: 'NATURAL',
    synonyms: ['yute', 'jute'],
  },
  {
    canonicalName: 'bambú',
    category: 'NATURAL',
    synonyms: ['fibra de bambu', 'fibra de bambú', 'bambu', 'bambú'],
  },

  // ========================
  // FIBRAS SEMISINTÉTICAS (Celulósicas regeneradas)
  // ========================
  {
    canonicalName: 'viscosa',
    category: 'SEMISYNTHETIC',
    synonyms: [
      'viscosa de bambu',
      'viscosa de bambú',
      'viscosa',
      'viscose',
      'rayon',
      'rayón',
    ],
  },
  {
    canonicalName: 'lyocell',
    category: 'SEMISYNTHETIC',
    synonyms: ['lyocell', 'tencel'],
  },
  {
    canonicalName: 'modal',
    category: 'SEMISYNTHETIC',
    synonyms: ['modal'],
  },
  {
    canonicalName: 'acetato',
    category: 'SEMISYNTHETIC',
    synonyms: ['triacetato', 'acetato'],
  },

  // ========================
  // FIBRAS SINTÉTICAS (Derivadas del petróleo / plásticos)
  // ========================
  {
    canonicalName: 'poliéster',
    category: 'SYNTHETIC',
    synonyms: [
      'poliester reciclado',
      'poliéster reciclado',
      'poliester',
      'poliéster',
      'polyester',
      'microfibra',
    ],
  },
  {
    canonicalName: 'elastano',
    category: 'SYNTHETIC',
    synonyms: [
      'elastano',
      'spandex',
      'lycra',
      'elastodieno',
      'elastomero',
      'elastómero',
    ],
  },
  {
    canonicalName: 'poliamida',
    category: 'SYNTHETIC',
    synonyms: ['poliamida', 'nylon', 'nailon', 'polyamide'],
  },
  {
    canonicalName: 'acrílico',
    category: 'SYNTHETIC',
    synonyms: ['acrilico', 'acrílico', 'acrylic'],
  },
  {
    canonicalName: 'poliuretano',
    category: 'SYNTHETIC',
    synonyms: [
      'poliuretano',
      'ecocuero',
      'cuero ecologico',
      'cuero ecológico',
      'simil cuero',
      'símil cuero',
    ],
  },
  {
    canonicalName: 'lúrex',
    category: 'SYNTHETIC',
    synonyms: [
      'fibra metalizada',
      'hilado metalizado',
      'metalizado',
      'lurex',
      'lúrex',
    ],
  },
];

/**
 * Normaliza un texto quitando tildes y pasándolo a minúsculas para comparaciones seguras.
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca a qué fibra del diccionario corresponde un nombre extraído de una ficha.
 */
export function resolveFiber(rawFiberName: string): {
  canonicalName: string;
  category: FiberCategory;
} | null {
  const cleaned = normalizeText(rawFiberName);
  if (!cleaned) return null;

  for (const def of FIBER_DICTIONARY) {
    for (const syn of def.synonyms) {
      const normalizedSyn = normalizeText(syn);
      // Coincidencia exacta o como palabra completa dentro del fragmento
      const wordBoundaryRegex = new RegExp(
        `(^|[^a-z0-9])${normalizedSyn}($|[^a-z0-9])`,
        'i',
      );
      if (cleaned === normalizedSyn || wordBoundaryRegex.test(cleaned)) {
        return {
          canonicalName: def.canonicalName,
          category: def.category,
        };
      }
    }
  }

  return null;
}
