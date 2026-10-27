import { Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

interface VtexProductItem {
  productId: string;
  productName: string;
  linkText: string;
  link: string;
  description?: string;
  categories?: string[];
  Composicion?: string[];
  Composición?: string[];
  items?: Array<{
    images?: Array<{ imageUrl?: string }>;
    sellers?: Array<{
      commertialOffer?: {
        Price?: number;
        ListPrice?: number;
        AvailableQuantity?: number;
      };
    }>;
  }>;
}

export class VtexScraperAdapter implements StoreScraperAdapter {
  private readonly logger: Logger;

  constructor(readonly brandMetadata: BrandScraperMetadata) {
    this.logger = new Logger(`VtexScraperAdapter:${brandMetadata.name}`);
  }

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 35;
    const results: ScrapedProductRaw[] = [];
    const seenNames = new Set<string>();

    const pageSize = 45;
    for (let from = 0; from < 135 && results.length < maxProducts; from += pageSize) {
      const to = from + pageSize - 1;
      const url = `${this.brandMetadata.websiteUrl}/api/catalog_system/pub/products/search?_from=${from}&_to=${to}`;

      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
        });

        if (!res.ok) break;
        const data = (await res.json()) as VtexProductItem[];
        if (!Array.isArray(data) || data.length === 0) break;

        for (const item of data) {
          if (results.length >= maxProducts) break;
          const parsed = this.mapVtexItem(item);
          if (!parsed) continue;

          // Evitar duplicar la misma prenda cuando VTEX la publica por separado en varios colores
          const normalizedTitle = parsed.name.toLowerCase().trim();
          if (seenNames.has(normalizedTitle)) continue;

          seenNames.add(normalizedTitle);
          results.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `Error consultando página VTEX (${from}-${to}) de ${this.brandMetadata.name}: ${(error as Error).message}`,
        );
        break;
      }
    }

    this.logger.log(
      `${this.brandMetadata.name} (VTEX): ${results.length} prendas extraídas.`,
    );
    return results;
  }

  mapVtexItem(item: VtexProductItem): ScrapedProductRaw | null {
    if (!item.productId || !item.productName) return null;

    const category = this.extractCleanCategory(item.categories);
    if (this.isNonClothingItem(category, item.productName)) {
      return null;
    }

    const compArray = item.Composicion || item.Composición || [];
    const compLine =
      compArray.length > 0 ? `Composición: ${compArray.join(' ')}` : '';
    const description = [compLine, item.description || '']
      .filter(Boolean)
      .join('\n');

    // Buscar el primer SKU con stock (o el primero por defecto)
    const skuWithStock =
      item.items?.find(
        (sku) =>
          (sku.sellers?.[0]?.commertialOffer?.AvailableQuantity ?? 0) > 0,
      ) ?? item.items?.[0];

    const offer = skuWithStock?.sellers?.[0]?.commertialOffer;
    const totalAvailable =
      item.items?.reduce(
        (acc, sku) =>
          acc + (sku.sellers?.[0]?.commertialOffer?.AvailableQuantity ?? 0),
        0,
      ) ?? 0;

    const listPrice = offer?.ListPrice ?? offer?.Price ?? null;
    const sellPrice = offer?.Price ?? null;
    const specialPrice =
      listPrice && sellPrice && sellPrice < listPrice ? sellPrice : null;

    const imageUrl = skuWithStock?.images?.[0]?.imageUrl ?? null;

    return {
      externalId: String(item.productId),
      name: this.formatTitleCase(item.productName.trim()),
      slug: item.linkText || String(item.productId),
      productUrl:
        item.link || `${this.brandMetadata.websiteUrl}/${item.linkText}/p`,
      imageUrl,
      price: listPrice,
      specialPrice,
      category,
      description,
      inStock: totalAvailable > 0,
    };
  }

  private extractCleanCategory(categories?: string[]): string | null {
    if (!categories || categories.length === 0) return null;
    for (const path of categories) {
      const segments = path
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      const specific = segments
        .reverse()
        .find(
          (seg) =>
            !/^(summer|winter|sale|general|coleccion|new\s*in|ss\d+|aw\d+)$/i.test(
              seg,
            ),
        );
      if (specific) return specific;
    }
    return null;
  }

  private isNonClothingItem(
    category: string | null,
    productName: string,
  ): boolean {
    const text = `${category ?? ''} ${productName}`.toLowerCase();
    return /\b(gift\s*box|gift\s*card|bolsa|collar|aros|perfume|fragancia|calzado|zapato|bota|sandalia|cartera|cinturon|cinturón|anteojos|gafas)\b/.test(
      text,
    );
  }

  private formatTitleCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
  }
}
