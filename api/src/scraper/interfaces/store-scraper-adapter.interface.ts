import { StorePlatform } from '@prisma/client';

export interface BrandScraperMetadata {
  name: string;
  slug: string;
  websiteUrl: string;
  platform: StorePlatform;
  isKnownBrand: boolean;
}

export interface ScrapedProductRaw {
  externalId: string;
  name: string;
  slug: string;
  productUrl: string;
  imageUrl: string | null;
  price: number | null;
  specialPrice: number | null;
  category: string | null;
  description: string;
  inStock: boolean;
}

export interface ScrapeOptions {
  /** Cantidad máxima de productos a procesar en la corrida (por defecto 20) */
  maxProducts?: number;
}

export interface StoreScraperAdapter {
  readonly brandMetadata: BrandScraperMetadata;
  scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]>;
}

export const STORE_SCRAPER_ADAPTERS = Symbol('STORE_SCRAPER_ADAPTERS');
