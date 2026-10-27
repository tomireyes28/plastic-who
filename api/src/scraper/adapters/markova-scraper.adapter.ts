import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

interface SchemaOrgProduct {
  '@type'?: string;
  name?: string;
  image?: string | string[];
  description?: string;
  offers?: {
    url?: string;
    price?: string | number;
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

  /** Prendas iniciales de la temporada activa desde donde el crawler descubre el resto */
  private readonly seedProductSlugs: string[] = [
    'g456_-_vestido-durbuy',
    'g539_-_blusa-toulouse',
    'g453_-_vestido-kolding',
    'g313_-_blazer-toulouse',
    'g200_-_pollera-taipei',
    'g312_-_blazer-corvus',
    'g816_-_top-galle',
    'g413_-_mono-hamburgo',
  ];

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 25;
    const queue: string[] = [...this.seedProductSlugs];
    const visited = new Set<string>();
    const results: ScrapedProductRaw[] = [];

    // Sembrar también desde la portada de Markova
    try {
      const homeHtml = await this.fetchHtml(this.brandMetadata.websiteUrl);
      for (const slug of this.extractProductSlugsFromHtml(homeHtml)) {
        if (!queue.includes(slug)) {
          queue.push(slug);
        }
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo leer la portada de Markova: ${(error as Error).message}`,
      );
    }

    while (queue.length > 0 && results.length < maxProducts) {
      const slug = queue.shift()!;
      if (visited.has(slug)) continue;
      visited.add(slug);

      const url = `${this.brandMetadata.websiteUrl}/productos/${slug}`;
      try {
        const html = await this.fetchHtml(url);

        // Descubrir nuevas prendas relacionadas ("Completá el look") dentro de la ficha
        for (const relatedSlug of this.extractProductSlugsFromHtml(html)) {
          if (!visited.has(relatedSlug) && !queue.includes(relatedSlug)) {
            queue.push(relatedSlug);
          }
        }

        const parsed = this.parseProductFromHtml(html, slug);
        if (parsed && !this.isNonClothingItem(parsed.name)) {
          results.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo procesar ${url}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Markova: ${results.length} prendas extraídas.`);
    return results;
  }

  extractProductSlugsFromHtml(html: string): string[] {
    const matches = [
      ...html.matchAll(
        /href=["'](?:https?:\/\/(?:www\.)?markova\.com)?\/?productos\/([^"'?#\s]+)/g,
      ),
    ].map((m) => m[1]);
    return Array.from(new Set(matches));
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
      inStock: true,
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
