import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

const NON_CLOTHING_KEYWORDS = [
  'gift-card',
  'tarjeta-de-regalo',
  'bolsa-de-lienzo',
  'pack-packaging',
];

const CATEGORY_MAP: Array<{ match: RegExp; name: string }> = [
  { match: /body|bodys/i, name: 'Bodys y Enteritos' },
  { match: /ranita/i, name: 'Ranitas y Pantalones' },
  { match: /pantalon|pantal[oó]n/i, name: 'Pantalones' },
  { match: /pijama/i, name: 'Pijamas' },
  { match: /short|bermuda/i, name: 'Shorts y Bermudas' },
  { match: /remera|musculosa/i, name: 'Remeras y Musculosas' },
  { match: /buzo/i, name: 'Buzos y Abrigos' },
  { match: /campera|rompevientos/i, name: 'Camperas y Abrigos' },
  { match: /vestido/i, name: 'Vestidos' },
  { match: /bata/i, name: 'Batas' },
];

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&#039;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&iexcl;/gi, '¡')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

@Injectable()
export class FunkyMonkeysScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(FunkyMonkeysScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'Funky Monkeys',
    slug: 'funky-monkeys',
    websiteUrl: 'https://www.funkymonkeys.com.ar',
    platform: 'TIENDANUBE',
    isKnownBrand: true,
  };

  private readonly sitemapUrl = 'https://www.funkymonkeys.com.ar/sitemap.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 300;
    this.logger.log(
      `Iniciando scraping de Funky Monkeys (límite: ${maxProducts} prendas)...`,
    );

    const productUrls = await this.fetchClothingUrlsFromSitemap();
    this.logger.log(
      `Detectadas ${productUrls.length} prendas infantiles en sitemap de Funky Monkeys`,
    );

    const targetUrls = productUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga controlada y pausada (concurrency = 2 con jitter delay)
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
      `Scraping de Funky Monkeys finalizado: ${results.length} prendas recuperadas exitosamente`,
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
        ...text.matchAll(
          /<loc>(https:\/\/www\.funkymonkeys\.com\.ar\/productos\/[^<]+)<\/loc>/g,
        ),
      ].map((m) => m[1]);

      return allUrls.filter((url) => {
        const lower = url.toLowerCase();
        if (lower === 'https://www.funkymonkeys.com.ar/productos/') return false;
        return !NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
      });
    } catch (error) {
      this.logger.error(
        `Error al leer sitemap de Funky Monkeys: ${(error as Error).message}`,
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
              `<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["']([^"']*)["']`,
              'i',
            ),
          ) ||
          html.match(
            new RegExp(
              `<meta\\s+content=["']([^"']*)["']\\s+(?:property|name)=["']${prop}["']`,
              'i',
            ),
          );
        return m ? m[1] : null;
      };

      const rawTitle = getMeta('og:title') || '';
      const name = rawTitle.replace(/\s*\|\s*Funky Monkeys/i, '').trim();
      const imageUrl =
        getMeta('og:image:secure_url') || getMeta('og:image') || null;

      // Precio
      const priceMatch =
        html.match(/"price":\s*"?([0-9.]+)"?/i) ||
        html.match(/data-price="([0-9.]+)"/i);
      const rawPrice =
        getMeta('product:price:amount') || (priceMatch ? priceMatch[1] : null);
      const price = rawPrice ? parseFloat(rawPrice) : null;

      // Stock
      const isOutOfStock =
        html.includes('class="out-of-stock"') ||
        html.includes('>Sin stock<') ||
        html.includes('>Agotado<');

      // Categoría
      let category = 'Indumentaria Infantil';
      for (const cat of CATEGORY_MAP) {
        if (cat.match.test(url) || cat.match.test(name)) {
          category = cat.name;
          break;
        }
      }

      // Descripción del producto (en Tiendanube es el contenedor js-product-description)
      const descMatch = html.match(
        /<div[^>]*class=["'][^"']*(?:js-product-description|product-description-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      );
      const cleanDesc = descMatch ? decodeHtmlEntities(descMatch[1]) : '';

      // Extracción y estandarización de composición:
      let finalDescription = cleanDesc;
      const lower = cleanDesc.toLowerCase();

      if (
        lower.includes('100% en algodón') ||
        lower.includes('algodón 100%') ||
        lower.includes('100% algodón') ||
        lower.includes('100% algodon') ||
        lower.includes('algodon 100%')
      ) {
        if (!/composici[oó]n/i.test(finalDescription)) {
          finalDescription = `${cleanDesc}\nComposición: 100% algodón.`;
        }
      } else if (
        lower.includes('100% viscosa') ||
        lower.includes('100% en viscosa') ||
        lower.includes('viscosa 100%')
      ) {
        if (!/composici[oó]n/i.test(finalDescription)) {
          finalDescription = `${cleanDesc}\nComposición: 100% viscosa.`;
        }
      } else if (
        lower.includes('rompevientos') &&
        lower.includes('jersey de algodón')
      ) {
        finalDescription = `${cleanDesc}\nExterior: 100% poliéster. Forrería: 100% algodón.`;
      }

      const slugMatch = url.match(/\/productos\/([^/]+)\/?$/);
      const slug = slugMatch
        ? slugMatch[1]
        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return {
        externalId: slug,
        name: this.formatTitleCase(name),
        slug,
        productUrl: url,
        imageUrl,
        price: price && Number.isFinite(price) ? price : null,
        specialPrice: null,
        category,
        description: finalDescription || cleanDesc || 'Indumentaria infantil Funky Monkeys.',
        inStock: !isOutOfStock,
      };
    } catch (error) {
      this.logger.warn(
        `Error procesando prenda de Funky Monkeys (${url}): ${(error as Error).message}`,
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
