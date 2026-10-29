import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

const NON_CLOTHING_KEYWORDS = [
  'hamaca',
  'toalla',
  'combo-playa',
  'combo-rio',
  'combo-sol',
  'combo-champaqui',
  'sombrero',
  'piluso',
  'gorra',
];

const CATEGORY_MAP: Array<{ match: RegExp; name: string }> = [
  { match: /remera/i, name: 'Remeras' },
  { match: /boxer|colaless/i, name: 'Ropa Interior' },
  { match: /top/i, name: 'Tops' },
  { match: /bermuda|short/i, name: 'Bermudas y Shorts' },
  { match: /pantalon|cargo/i, name: 'Pantalones' },
  { match: /campera|anorak/i, name: 'Camperas y Abrigos' },
  { match: /cuellito/i, name: 'Accesorios Textiles' },
];

@Injectable()
export class OnePlaceWorldScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(OnePlaceWorldScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'One Place World',
    slug: 'one-place-world',
    websiteUrl: 'https://oneplaceworld.com',
    platform: 'TIENDANUBE',
    isKnownBrand: true,
  };

  private readonly sitemapUrl = 'https://oneplaceworld.com/sitemap.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 200;
    this.logger.log(
      `Iniciando scraping de One Place World (límite: ${maxProducts} prendas)...`,
    );

    const productUrls = await this.fetchClothingUrlsFromSitemap();
    this.logger.log(
      `Detectadas ${productUrls.length} prendas de indumentaria en sitemap de One Place World`,
    );

    const targetUrls = productUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga tranquila y controlada (concurrency = 2 con jitter delay)
    const chunkSize = 2;
    for (let i = 0; i < targetUrls.length; i += chunkSize) {
      const chunk = targetUrls.slice(i, i + chunkSize);
      const chunkPromises = chunk.map((url) => this.fetchProductDetail(url));
      const chunkResults = await Promise.all(chunkPromises);

      for (const item of chunkResults) {
        if (item) {
          results.push(item);
        }
      }

      if (i + chunkSize < targetUrls.length) {
        const delay = 250 + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.logger.log(
      `Scraping de One Place World finalizado: ${results.length} prendas recuperadas exitosamente`,
    );
    return results;
  }

  async fetchClothingUrlsFromSitemap(): Promise<string[]> {
    try {
      const response = await fetch(this.sitemapUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`Sitemap HTTP ${response.status}`);
      }

      const text = await response.text();
      const allUrls = [
        ...text.matchAll(/<loc>(https:\/\/oneplaceworld\.com\/productos\/[^<]+)<\/loc>/g),
      ].map((m) => m[1]);

      return allUrls.filter((url) => {
        const lower = url.toLowerCase();
        if (lower === 'https://oneplaceworld.com/productos/') return false;
        return !NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
      });
    } catch (error) {
      this.logger.error(
        `Error al leer sitemap de One Place World: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchProductDetail(url: string): Promise<ScrapedProductRaw | null> {
    try {
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
      };

      let response = await fetch(url, { headers });

      if (response.status === 429 || response.status === 503) {
        this.logger.warn(`Pausa por rate-limit (${response.status}) en ${url}...`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
        response = await fetch(url, { headers });
      }

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
      const name = rawTitle.replace(/\s*\|\s*One Place World/i, '').trim();
      const imageUrl =
        getMeta('og:image:secure_url') || getMeta('og:image') || null;

      // Precio desde metadatos Tiendanube o meta tags
      const priceMatch =
        html.match(/"price":\s*"?([0-9.]+)"?/i) ||
        html.match(/data-price="([0-9.]+)"/i);
      const rawPrice = getMeta('product:price:amount') || (priceMatch ? priceMatch[1] : null);
      const price = rawPrice ? parseFloat(rawPrice) : null;

      // Stock
      const isOutOfStock =
        html.includes('class="out-of-stock"') ||
        html.includes('>Sin stock<') ||
        html.includes('>Agotado<');

      // Determinar categoría
      let category = 'Indumentaria';
      for (const cat of CATEGORY_MAP) {
        if (cat.match.test(url) || cat.match.test(name)) {
          category = cat.name;
          break;
        }
      }

      // Determinar composición técnica:
      // Si es parte de su línea de bambú (mencionada en título, slug o categoría),
      // su ficha técnica oficial especifica: 96% bambú y 4% elastano.
      const isBambooLine =
        /bamb[uú]/i.test(name) ||
        /bamb[uú]/i.test(url) ||
        html.includes('LINEA DE BAMBÚ') ||
        html.includes('LINEA\\u0020DE\\u0020BAMB\\u00DA');

      const description = isBambooLine
        ? 'Línea de Bambú One Place World.\nComposición: 96% bambú y 4% elastano.\nTela hipoalergénica, antibacteriana y transpirable.'
        : 'Indumentaria técnica One Place World.';

      const slugMatch = url.match(/\/productos\/([^/]+)\/?$/);
      const slug = slugMatch ? slugMatch[1] : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return {
        externalId: slug,
        name: this.formatTitleCase(name),
        slug,
        productUrl: url,
        imageUrl,
        price: price && Number.isFinite(price) ? price : null,
        specialPrice: null,
        category,
        description,
        inStock: !isOutOfStock,
      };
    } catch (error) {
      this.logger.warn(
        `Error procesando prenda de One Place World (${url}): ${(error as Error).message}`,
      );
      return null;
    }
  }

  private formatTitleCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
  }
}
