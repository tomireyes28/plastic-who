export type FiberCategory = 'NATURAL' | 'SEMISYNTHETIC' | 'SYNTHETIC';

export type TrafficLightColor = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export interface ParsedFiberItem {
  id?: string;
  fiberName: string;
  category: FiberCategory;
  percentage: number;
  isLining: boolean;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  platform: string;
  isKnownBrand: boolean;
  lastScrapedAt: string | null;
  productCount: number;
}

export interface ProductCardItem {
  id: string;
  externalId: string;
  name: string;
  slug: string;
  productUrl: string;
  imageUrl: string | null;
  price: number | null;
  specialPrice: number | null;
  category: string | null;
  rawComposition: string | null;
  naturalPercentage: number;
  semiSyntheticPercentage: number;
  syntheticPercentage: number;
  trafficLight: TrafficLightColor;
  hasSyntheticLining: boolean;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  fibers: ParsedFiberItem[];
}
