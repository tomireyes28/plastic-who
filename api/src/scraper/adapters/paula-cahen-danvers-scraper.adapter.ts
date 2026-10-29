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
  sku?: string;
  image?: string | string[];
  description?: string;
  offers?: {
    '@type'?: string;
    price?: string | number;
    availability?: string;
    url?: string;
  };
}

interface SchemaOrgBreadcrumb {
  '@type'?: string;
  itemListElement?: Array<{
    '@type'?: string;
    position?: number;
    name?: string;
  }>;
}

const NON_CLOTHING_KEYWORDS = [
  'anteojo',
  'armazon',
  'billetera',
  'cinto',
  'cinturon',
  'perfume',
  'fragancia',
  'vela',
  'cartera',
  'bolso',
  'neceser',
  'mochila',
  'reloj',
  'llavero',
  'paraguas',
];

@Injectable()
export class PaulaCahenDanversScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(PaulaCahenDanversScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: "Paula Cahen D'Anvers",
    slug: 'paula-cahen-danvers',
    websiteUrl: 'https://www.paulacahendanvers.com.ar',
    platform: 'POW',
    isKnownBrand: true,
  };

  private readonly sitemapUrl =
    'https://www.paulacahendanvers.com.ar/sitemap_productos.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 30;
    this.logger.log(
      `Iniciando scraping de Paula Cahen D'Anvers (límite: ${maxProducts} prendas)...`,
    );

    const allUrls = await this.fetchProductUrlsFromSitemap();
    this.logger.log(
      `Detectados ${allUrls.length} productos en sitemap de Paula Cahen D'Anvers`,
    );

    // Filtrar accesorios evidentes por URL para priorizar prendas textiles
    const clothingUrls = allUrls.filter((url) => {
      const lower = url.toLowerCase();
      return !NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
    });

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
      `Scraping de Paula Cahen D'Anvers finalizado: ${results.length} prendas procesadas`,
    );
    return results;
  }

  async fetchProductUrlsFromSitemap(): Promise<string[]> {
    try {
      const res = await fetch(this.sitemapUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (!res.ok) {
        throw new Error(`Sitemap HTTP ${res.status}`);
      }

      const text = await res.text();
      return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    } catch (error) {
      this.logger.error(
        `Error leyendo sitemap_productos de Paula Cahen D'Anvers: ${(error as Error).message}`,
      );
      return [];
    }
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

      // 1. Extraer JSON-LD Schema.org (Product y Breadcrumbs)
      const ldScripts = [
        ...html.matchAll(
          /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi,
        ),
      ].map((m) => m[1]);

      let productLd: SchemaOrgProduct | null = null;
      let breadcrumbLd: SchemaOrgBreadcrumb | null = null;

      for (const scriptContent of ldScripts) {
        try {
          const parsed = JSON.parse(scriptContent);
          if (parsed['@type'] === 'Product') {
            productLd = parsed as SchemaOrgProduct;
          } else if (parsed['@type'] === 'BreadcrumbList') {
            breadcrumbLd = parsed as SchemaOrgBreadcrumb;
          }
        } catch {
          // Ignorar JSON malformado
        }
      }

      // 2. Extraer Composición técnica desde el panel o metadatos
      const panelMatch = html.match(
        /id=["']panel-composicion["'][^>]*>([\s\S]*?)<\/div>/i,
      );
      let panelText: string | null = null;
      if (panelMatch) {
        panelText = panelMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // 3. Fallbacks OpenGraph
      const ogTitleMatch = html.match(
        /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i,
      );
      const ogDescMatch = html.match(
        /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i,
      );
      const ogImageMatch = html.match(
        /<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i,
      );

      const name =
        productLd?.name ||
        (ogTitleMatch ? ogTitleMatch[1] : null) ||
        'Prenda Paula Cahen';

      let imageUrl: string | null = null;
      if (productLd?.image) {
        imageUrl = Array.isArray(productLd.image)
          ? productLd.image[0]
          : productLd.image;
      } else if (ogImageMatch) {
        imageUrl = ogImageMatch[1];
      }

      const rawPrice = productLd?.offers?.price;
      const price = rawPrice ? parseFloat(String(rawPrice)) : null;

      const availability = productLd?.offers?.availability;
      const inStock = availability
        ? availability.includes('InStock')
        : true;

      // 4. Categoría desde Breadcrumbs o URL
      let category: string | null = null;
      if (breadcrumbLd?.itemListElement && breadcrumbLd.itemListElement.length >= 3) {
        const item = breadcrumbLd.itemListElement[2];
        if (item && item.name && item.name !== 'Home' && item.name !== 'MUJER') {
          category = item.name;
        } else if (breadcrumbLd.itemListElement[1]?.name) {
          category = breadcrumbLd.itemListElement[1].name;
        }
      }

      // 5. SKU / ExternalId
      const skuMatch = url.match(/\/productos\/([^_]+)_-_/);
      const externalId = productLd?.sku || (skuMatch ? skuMatch[1] : url);

      const slug =
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || externalId.toLowerCase();

      // Construcción enriquecida de descripción con panel de composición
      const ogDesc = ogDescMatch ? ogDescMatch[1] : '';
      const description = [
        panelText ? `Composición: ${panelText}` : null,
        ogDesc,
      ]
        .filter(Boolean)
        .join('\n\n');

      return {
        externalId,
        name,
        slug,
        productUrl: url,
        imageUrl,
        price,
        specialPrice: null,
        category: category || 'Indumentaria',
        description,
        inStock,
      };
    } catch (error) {
      this.logger.warn(
        `Error procesando prenda de Paula Cahen D'Anvers (${url}): ${(error as Error).message}`,
      );
      return null;
    }
  }
}
