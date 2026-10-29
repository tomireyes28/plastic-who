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
  'bolso',
  'cartera',
  'billetera',
  'neceser',
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
  'sombrero',
  'gorra',
  'panuelo',
  'hebilla',
  'vincha',
];

interface PowNextItemPayload {
  id: number | string;
  title: string;
  slug: string;
  description?: string;
  brief_description?: string;
  categories?: Array<{ id: number; name: string; slug: string }>;
  total_stock?: number;
  no_stock?: boolean;
  pictures?: string[];
  variant?: {
    non_formatted_price?: number;
    non_formatted_special_price?: number;
    has_special_price?: boolean;
  };
}

@Injectable()
export class WanamaScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(WanamaScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'Wanama',
    slug: 'wanama',
    websiteUrl: 'https://www.wanama.com',
    platform: 'POW',
    isKnownBrand: true,
  };

  private readonly sitemapUrl = 'https://www.wanama.com/sitemap_productos.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 500;
    const productUrls = await this.discoverProductUrls(maxProducts);

    this.logger.log(
      `Wanama: se descubrieron ${productUrls.length} prendas candidatas (límite: ${maxProducts})`,
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
          if (parsed && !this.isAccessoryCategory(parsed.category, parsed.name)) {
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

    this.logger.log(
      `Scraping de Wanama finalizado: ${results.length} prendas procesadas`,
    );
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
        `Error leyendo sitemap de Wanama: ${(error as Error).message}. Usando fallback.`,
      );
      return [
        'https://www.wanama.com/productos/113-3367_-_camisa_new_margarite',
        'https://www.wanama.com/productos/110-3313_-_remera_berthie_pima_ii',
      ];
    }
  }

  /**
   * Extrae los datos estructurados del producto desde el payload Next.js (`self.__next_f.push`) de POW.
   */
  parseProductFromHtml(
    html: string,
    fallbackSlug: string,
  ): ScrapedProductRaw | null {
    const item = this.extractPowItemPayload(html);
    if (!item || !item.title) return null;

    const slug = item.slug || fallbackSlug;
    const category = this.pickBestCategoryName(item.categories);
    const price = item.variant?.non_formatted_price ?? null;
    const specialPrice =
      item.variant?.has_special_price &&
      item.variant?.non_formatted_special_price
        ? item.variant.non_formatted_special_price
        : null;

    const panelMatch = html.match(
      /id=["']panel-composicion["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    let panelText: string | null = null;
    if (panelMatch) {
      panelText = panelMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const description = [
      panelText ? `Composición: ${panelText}` : null,
      item.description,
      item.brief_description,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      externalId: String(item.id),
      name: item.title.trim(),
      slug,
      productUrl: `${this.brandMetadata.websiteUrl}/productos/${slug}`,
      imageUrl: item.pictures?.[0] ?? null,
      price,
      specialPrice,
      category,
      description,
      inStock: (item.total_stock ?? 0) > 0 && !item.no_stock,
    };
  }

  private extractPowItemPayload(html: string): PowNextItemPayload | null {
    const scriptMatches = [
      ...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g),
    ];

    for (const match of scriptMatches) {
      try {
        const unescaped = JSON.parse(`"${match[1]}"`) as string;
        const itemIdx = unescaped.indexOf('"item":{"id":');
        if (itemIdx === -1) continue;

        const startBrace = unescaped.indexOf('{', itemIdx + 6);
        const jsonObjectStr = this.extractBalancedJsonObject(
          unescaped,
          startBrace,
        );
        if (jsonObjectStr) {
          return JSON.parse(jsonObjectStr) as PowNextItemPayload;
        }
      } catch {
        // Continuar buscando en el siguiente chunk de Next.js
      }
    }

    return null;
  }

  private extractBalancedJsonObject(
    text: string,
    startBraceIndex: number,
  ): string | null {
    if (startBraceIndex < 0 || text[startBraceIndex] !== '{') return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startBraceIndex; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            return text.slice(startBraceIndex, i + 1);
          }
        }
      }
    }

    return null;
  }

  private pickBestCategoryName(
    categories?: Array<{ id: number; name: string; slug: string }>,
  ): string | null {
    if (!categories || categories.length === 0) return null;
    // Ignorar categorías genéricas de promoción o temporada ("SS27", "Special Price", "New in")
    const specific = categories.find(
      (c) =>
        !/^(ss\d+|aw\d+|new\s*in|special\s*price|sale|coleccion|tu\s*es)/i.test(
          c.name.trim(),
        ),
    );
    return specific?.name ?? categories[0].name;
  }

  private isAccessoryCategory(
    category: string | null,
    productName: string,
  ): boolean {
    const combined = `${category ?? ''} ${productName}`.toLowerCase();
    return /\b(collar|aros|anillo|pulsera|perfume|fragancia|llavero|anteojos)\b/.test(
      combined,
    );
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
