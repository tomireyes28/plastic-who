import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

const CATEGORY_MAP: Record<string, string> = {
  BL: 'Blusas',
  CA: 'Camisas',
  TO: 'Tops',
  PA: 'Pantalones',
  VE: 'Vestidos',
  CH: 'Chalecos',
  SH: 'Shorts',
  JE: 'Jeans',
  FA: 'Faldas',
  MO: 'Monos',
  TE: 'Tejidos',
  PO: 'Poleras',
  HA: 'Chaquetas',
};

@Injectable()
export class IndiaStyleScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(IndiaStyleScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'India Style',
    slug: 'india-style',
    websiteUrl: 'https://indiastyle.com.ar',
    platform: 'TIENDANUBE',
    isKnownBrand: true,
  };

  private readonly sitemapUrl = 'https://indiastyle.com.ar/sitemap.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 30;
    this.logger.log(
      `Iniciando scraping de India Style (límite: ${maxProducts} prendas)...`,
    );

    const productUrls = await this.fetchClothingUrlsFromSitemap();
    this.logger.log(
      `Detectadas ${productUrls.length} prendas de indumentaria en sitemap de India Style`,
    );

    const targetUrls = productUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga concurrente controlada (concurrency = 4 para cuidar la tienda)
    const chunkSize = 4;
    for (let i = 0; i < targetUrls.length; i += chunkSize) {
      const chunk = targetUrls.slice(i, i + chunkSize);
      const chunkPromises = chunk.map((url) => this.fetchProductDetail(url));
      const chunkResults = await Promise.all(chunkPromises);

      for (const item of chunkResults) {
        if (item) {
          results.push(item);
        }
      }
    }

    this.logger.log(
      `Scraping de India Style finalizado: ${results.length} prendas recuperadas exitosamente`,
    );
    return results;
  }

  /**
   * Lee el sitemap.xml y extrae únicamente URLs que coincidan con SKUs de indumentaria textil.
   */
  async fetchClothingUrlsFromSitemap(): Promise<string[]> {
    try {
      const response = await fetch(this.sitemapUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`Sitemap HTTP ${response.status}`);
      }

      const text = await response.text();
      const allUrls = [
        ...text.matchAll(
          /<loc>(https:\/\/indiastyle\.com\.ar\/productos\/[^<]+)<\/loc>/g,
        ),
      ].map((m) => m[1]);

      // Filtra accesorios (hebillas, collares, etc.) quedándose con SKUs textiles (1BL, 1TO, 1PA, 1VE, 1CA, etc.)
      const clothingSkuPattern = /\/productos\/\d([A-Z]{2})[A-Z0-9_-]+\/?$/;
      return allUrls.filter((url) => clothingSkuPattern.test(url));
    } catch (error) {
      this.logger.error(
        `Error al leer sitemap de India Style: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Obtiene la ficha de producto parseando metadatos OpenGraph y Tiendanube sin dependencias pesadas.
   */
  async fetchProductDetail(url: string): Promise<ScrapedProductRaw | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Error ${response.status} al obtener ${url}`);
        return null;
      }

      const html = await response.text();

      const getMeta = (prop: string): string | null => {
        const m =
          html.match(
            new RegExp(
              `<meta\\s+property=["']${prop}["']\\s+content=["']([^"']*)["']`,
              'i',
            ),
          ) ||
          html.match(
            new RegExp(
              `<meta\\s+content=["']([^"']*)["']\\s+property=["']${prop}["']`,
              'i',
            ),
          );
        return m ? m[1] : null;
      };

      const rawTitle = getMeta('og:title') || '';
      const name = rawTitle.replace(/\s*\|\s*India Style/i, '').trim();
      const description = getMeta('og:description') || '';
      const imageUrl =
        getMeta('og:image:secure_url') || getMeta('og:image') || null;

      const rawPrice = getMeta('tiendanube:price');
      const price = rawPrice ? parseFloat(rawPrice) : null;

      const rawStock = getMeta('tiendanube:stock') ?? '1';
      const inStock = parseInt(rawStock, 10) > 0;

      // Extraer SKU y deducir categoría
      const skuMatch = url.match(/\/productos\/(\d([A-Z]{2})[A-Z0-9_-]+)\/?$/);
      const externalId = skuMatch ? skuMatch[1] : url;
      const categoryCode = skuMatch ? skuMatch[2] : '';
      const category = CATEGORY_MAP[categoryCode] || 'Indumentaria';

      const slug =
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || externalId.toLowerCase();

      return {
        externalId,
        name: name || `Prenda ${externalId}`,
        slug,
        productUrl: url,
        imageUrl,
        price,
        specialPrice: null,
        category,
        description,
        inStock,
      };
    } catch (error) {
      this.logger.warn(
        `Fallo al procesar prenda de India Style (${url}): ${(error as Error).message}`,
      );
      return null;
    }
  }
}
