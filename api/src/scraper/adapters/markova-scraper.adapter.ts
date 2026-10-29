import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

const NON_CLOTHING_KEYWORDS = [
  'bota',
  'zapatilla',
  'zueco',
  'sandalia',
  'zapato',
  'stiletto',
  'bolso',
  'cartera',
  'billetera',
  'mochila',
  'anteojo',
  'armazon',
  'perfume',
  'fragancia',
  'vela',
  'llavero',
  'aro',
  'collar',
  'pulsera',
  'anillo',
  'cinto',
  'cinturon',
  'cinturón',
  'sombrero',
  'gorra',
  'panuelo',
  'hebilla',
  'vincha',
];

interface SchemaOrgProduct {
  '@type'?: string;
  name?: string;
  image?: string | string[];
  description?: string;
  offers?: {
    url?: string;
    price?: string | number;
    availability?: string;
  };
}

@Injectable()
export class MarkovaScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(MarkovaScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'Markova',
    slug: 'markova',
    websiteUrl: 'https://markova.com',
    platform: 'POW',
    isKnownBrand: true,
  };

  private readonly sitemapUrl = 'https://markova.com/sitemap_productos.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 500;
    const productUrls = await this.discoverProductUrls(maxProducts);

    this.logger.log(
      `Markova: se descubrieron ${productUrls.length} prendas candidatas (límite: ${maxProducts})`,
    );

    const targetUrls = productUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga tranquila y controlada (concurrency = 2 con jitter delay para no despertar Cloudflare/WAF)
    const chunkSize = 2;
    for (let i = 0; i < targetUrls.length; i += chunkSize) {
      const chunk = targetUrls.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (url) => {
        try {
          const html = await this.fetchHtml(url);
          const slug = url.split('/productos/')[1] || url;
          const parsed = this.parseProductFromHtml(html, slug);
          if (parsed && !this.isNonClothingItem(parsed.name)) {
            return parsed;
          }
        } catch (error) {
          this.logger.warn(`Error al extraer ${url}: ${(error as Error).message}`);
        }
        return null;
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const item of chunkResults) {
        if (item) results.push(item);
      }

      if (i + chunkSize < targetUrls.length) {
        const delay = 250 + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.logger.log(`Markova: ${results.length} prendas extraídas.`);
    return results;
  }

  async discoverProductUrls(limit: number): Promise<string[]> {
    try {
      const res = await fetch(this.sitemapUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (!res.ok) {
        throw new Error(`Sitemap HTTP ${res.status}`);
      }

      const text = await res.text();
      const allUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

      return allUrls
        .filter((url) => {
          const lower = url.toLowerCase();
          return !NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
        })
        .slice(0, limit);
    } catch (error) {
      this.logger.warn(
        `Error leyendo sitemap de Markova: ${(error as Error).message}. Usando fallback.`,
      );
      return [
        'https://markova.com/productos/g456_-_vestido-durbuy',
        'https://markova.com/productos/g539_-_blusa-toulouse',
      ];
    }
  }

  parseProductFromHtml(
    html: string,
    slug: string,
  ): ScrapedProductRaw | null {
    const schemaProduct = this.extractSchemaOrgProduct(html);
    if (!schemaProduct || !schemaProduct.name) return null;

    // Extraer el bloque "Composición: ..." del cuerpo HTML
    const compBlockMatch = html.match(
      /Composici[oó]n\s*:\s*([\s\S]{1,180}?)(?:<\/p>|<\/div>|Cuidados\s*:)/i,
    );
    const compLine = compBlockMatch
      ? `Composición: ${compBlockMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`
      : '';

    const description = [compLine, schemaProduct.description || '']
      .filter(Boolean)
      .join('\n');

    const rawPrice = schemaProduct.offers?.price
      ? parseFloat(String(schemaProduct.offers.price))
      : null;

    const imageUrl = Array.isArray(schemaProduct.image)
      ? schemaProduct.image[0]
      : (schemaProduct.image ?? null);

    const name = this.formatTitleCase(schemaProduct.name.trim());

    const isOutOfStock =
      schemaProduct.offers?.availability?.includes('OutOfStock') ||
      html.includes('class="out-of-stock"') ||
      html.includes('>Sin stock<') ||
      html.includes('>Agotado<');

    return {
      externalId: slug,
      name,
      slug,
      productUrl: `${this.brandMetadata.websiteUrl}/productos/${slug}`,
      imageUrl,
      price: rawPrice && Number.isFinite(rawPrice) ? rawPrice : null,
      specialPrice: null,
      category: this.inferCategoryFromName(name),
      description,
      inStock: !isOutOfStock,
    };
  }

  private extractSchemaOrgProduct(html: string): SchemaOrgProduct | null {
    const scripts = [
      ...html.matchAll(
        /<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi,
      ),
    ];

    for (const match of scripts) {
      try {
        const parsed = JSON.parse(match[1]) as SchemaOrgProduct;
        if (parsed && parsed['@type'] === 'Product') {
          return parsed;
        }
      } catch {
        // Ignorar bloques JSON-LD malformados
      }
    }
    return null;
  }

  private inferCategoryFromName(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('vestido') || lower.includes('mono')) return 'Vestidos';
    if (lower.includes('camisa') || lower.includes('blusa')) return 'Camisas';
    if (lower.includes('blazer') || lower.includes('saco') || lower.includes('chaleco'))
      return 'Sastrería';
    if (lower.includes('pantalon') || lower.includes('pantalón') || lower.includes('palazzo'))
      return 'Pantalones';
    if (lower.includes('jean')) return 'Jeans';
    if (lower.includes('remera') || lower.includes('top') || lower.includes('musculosa'))
      return 'Remeras y Tops';
    if (lower.includes('sweater') || lower.includes('cardigan') || lower.includes('polera'))
      return 'Tejidos';
    if (lower.includes('pollera') || lower.includes('falda') || lower.includes('short') || lower.includes('skort'))
      return 'Faldas y Shorts';
    if (lower.includes('tapado') || lower.includes('campera') || lower.includes('parka'))
      return 'Abrigos';
    return 'Indumentaria';
  }

  private isNonClothingItem(name: string): boolean {
    return /\b(sandalia|zapato|bota|stiletto|cartera|cinturon|cinturón|collar|aros|perfume)\b/i.test(
      name,
    );
  }

  private formatTitleCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
  }

  private async fetchHtml(url: string): Promise<string> {
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
      throw new Error(`HTTP ${response.status} al consultar ${url}`);
    }

    return response.text();
  }
}
