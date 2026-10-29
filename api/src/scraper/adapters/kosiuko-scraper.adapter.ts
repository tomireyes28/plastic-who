import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

const SEED_CATEGORIES = [
  'https://www.kosiuko.com/destacados/new-in.html',
  'https://www.kosiuko.com/coleccion/abrigos.html',
  'https://www.kosiuko.com/coleccion/blazers-y-chalecos.html',
  'https://www.kosiuko.com/destacados/sale.html',
];

const NON_CLOTHING_KEYWORDS = [
  'bota',
  'sandalia',
  'zapatilla',
  'zapato',
  'panuelo',
  'cartera',
  'bolso',
  'billetera',
  'cinto',
  'cinturon',
  'armazon',
  'anteojo',
  'fragancia',
  'perfume',
];

const CATEGORY_KEYWORDS: Array<{ match: RegExp; name: string }> = [
  { match: /vestido/i, name: 'Vestidos' },
  { match: /camisa/i, name: 'Camisas' },
  { match: /remera|t-shirt/i, name: 'Remeras' },
  { match: /jean|denim/i, name: 'Jeans' },
  { match: /pantalon/i, name: 'Pantalones' },
  { match: /short/i, name: 'Shorts' },
  { match: /sweater|cardigan|pullover|tejido/i, name: 'Sweaters' },
  { match: /buzo/i, name: 'Buzos' },
  { match: /blazer|chaleco|saco/i, name: 'Blazers y Chalecos' },
  { match: /campera|tapado|trench/i, name: 'Camperas y Abrigos' },
  { match: /falda|pollera/i, name: 'Faldas' },
  { match: /top|musculosa/i, name: 'Tops' },
];

@Injectable()
export class KosiukoScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(KosiukoScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'Kosiuko',
    slug: 'kosiuko',
    websiteUrl: 'https://www.kosiuko.com',
    platform: 'OTHER',
    isKnownBrand: true,
  };

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 30;
    this.logger.log(
      `Iniciando scraping de Kosiuko (límite: ${maxProducts} prendas)...`,
    );

    const clothingUrls = await this.discoverProductUrls();
    this.logger.log(
      `Detectadas ${clothingUrls.length} prendas de indumentaria candidatas en Kosiuko`,
    );

    const targetUrls = clothingUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga concurrente controlada (concurrency = 4)
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
      `Scraping de Kosiuko finalizado: ${results.length} prendas recuperadas exitosamente`,
    );
    return results;
  }

  async discoverProductUrls(): Promise<string[]> {
    const collected = new Set<string>();

    for (const catUrl of SEED_CATEGORIES) {
      try {
        const res = await fetch(catUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!res.ok) continue;

        const html = await res.text();
        const links = [
          ...html.matchAll(/class="product-item-link"\s+href="([^"]+)"/g),
        ].map((m) => m[1]);

        for (const link of links) {
          const lower = link.toLowerCase();
          if (!NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw))) {
            collected.add(link);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Error obteniendo categoría de Kosiuko (${catUrl}): ${(error as Error).message}`,
        );
      }
    }

    return Array.from(collected);
  }

  async fetchProductDetail(url: string): Promise<ScrapedProductRaw | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!res.ok) {
        this.logger.warn(`Error ${res.status} al obtener ${url}`);
        return null;
      }

      const html = await res.text();

      // 1. Título
      const titleMatch =
        html.match(/<span class="base"[^>]*>([\s\S]*?)<\/span>/i) ||
        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
      const name = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'Prenda Kosiuko';

      // 2. Precio
      const priceMatch =
        html.match(/data-price-amount="([0-9.]+)"/i) ||
        html.match(/"finalPrice":\{"amount":([0-9.]+)/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      // 3. Imagen
      const imgMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i) ||
        html.match(/"full":\s*"([^"]+)"/i);
      const imageUrl = imgMatch ? imgMatch[1].replace(/\\/g, '') : null;

      // 4. Material y Descripción
      const matMatch =
        html.match(/data-th="Material">([^<]*)</i) ||
        html.match(/data-th="Composición">([^<]*)</i);
      const material = matMatch ? matMatch[1].trim() : null;

      const descMatch =
        html.match(/id="product-attribute-specs-table"[^>]*>([\s\S]*?)<\/table>/i) ||
        html.match(/class="product attribute description"[^>]*>([\s\S]*?)<\/div>/i);
      const bodyDesc = descMatch
        ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

      const description = [
        material ? `Composición: ${material}` : null,
        bodyDesc || null,
      ]
        .filter(Boolean)
        .join('\n\n');

      // 5. Categoría
      let category = 'Indumentaria';
      for (const item of CATEGORY_KEYWORDS) {
        if (item.match.test(url) || item.match.test(name)) {
          category = item.name;
          break;
        }
      }

      // 6. SKU y Slug
      const skuMatch = url.match(/\/(\d{4,}[a-z0-9_-]+)\.html$/i);
      const externalId = skuMatch ? skuMatch[1] : url;

      const slug =
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || externalId.toLowerCase();

      return {
        externalId,
        name,
        slug,
        productUrl: url,
        imageUrl,
        price: price && price > 0 ? price : null,
        specialPrice: null,
        category,
        description,
        inStock: true,
      };
    } catch (error) {
      this.logger.warn(
        `Error procesando prenda de Kosiuko (${url}): ${(error as Error).message}`,
      );
      return null;
    }
  }
}
