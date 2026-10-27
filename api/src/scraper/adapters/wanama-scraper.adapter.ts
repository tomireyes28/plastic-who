import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

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

  /** Categorías principales de indumentaria para descubrir prendas activas */
  private readonly seedCategoryPaths: string[] = [
    '/categorias/camisas-ss27',
    '/categorias/remeras-ss27',
    '/categorias/denim-ss27',
    '/categorias/vestidos-monos-ss27',
    '/categorias/sweater-ss27',
    '/categorias/pantalones-ss27',
    '/categorias/coleccion-ss-27',
  ];

  /** Prendas semilla garantizadas por si cambia el nombre de una colección */
  private readonly fallbackProductPaths: string[] = [
    '/productos/113-3367_-_camisa_new_margarite',
    '/productos/110-3313_-_remera_berthie_pima_ii',
  ];

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 20;
    const productPaths = await this.discoverProductPaths(maxProducts);

    this.logger.log(
      `Wanama: se descubrieron ${productPaths.length} links de productos (límite: ${maxProducts})`,
    );

    const results: ScrapedProductRaw[] = [];

    for (const path of productPaths.slice(0, maxProducts)) {
      const url = `${this.brandMetadata.websiteUrl}${path}`;
      try {
        const html = await this.fetchHtml(url);
        const slug = path.replace('/productos/', '');
        const parsed = this.parseProductFromHtml(html, slug);

        if (parsed && !this.isAccessoryCategory(parsed.category, parsed.name)) {
          results.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo extraer el producto ${url}: ${(error as Error).message}`,
        );
      }
    }

    return results;
  }

  /**
   * Descubre URLs de productos (`/productos/...`) recorriendo las páginas de categorías.
   */
  async discoverProductPaths(limit: number): Promise<string[]> {
    const discovered = new Set<string>(this.fallbackProductPaths);

    for (const catPath of this.seedCategoryPaths) {
      if (discovered.size >= limit) break;
      try {
        const html = await this.fetchHtml(
          `${this.brandMetadata.websiteUrl}${catPath}`,
        );
        for (const prodPath of this.extractProductLinksFromHtml(html)) {
          discovered.add(prodPath);
          if (discovered.size >= limit) break;
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo leer la categoría ${catPath}: ${(error as Error).message}`,
        );
      }
    }

    return Array.from(discovered);
  }

  /**
   * Extrae todas las rutas `/productos/<slug>` presentes en un documento HTML.
   */
  extractProductLinksFromHtml(html: string): string[] {
    const matches = html.match(/\/productos\/[a-zA-Z0-9_-]+/g) || [];
    return Array.from(new Set(matches));
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

    const description = [item.description, item.brief_description]
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
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al consultar ${url}`);
    }

    return response.text();
  }
}
