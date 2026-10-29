import { Injectable, Logger } from '@nestjs/common';
import {
  BrandScraperMetadata,
  ScrapeOptions,
  ScrapedProductRaw,
  StoreScraperAdapter,
} from '../interfaces/store-scraper-adapter.interface';

const NON_CLOTHING_KEYWORDS = ['gift-card', 'tarjeta-de-regalo'];

const CATEGORY_MAP: Array<{ match: RegExp; name: string }> = [
  { match: /vestido|jumper|solero/i, name: 'Vestidos' },
  { match: /falda|mini/i, name: 'Faldas y Polleras' },
  { match: /pantalon|pantal[oó]n/i, name: 'Pantalones' },
  { match: /blusa/i, name: 'Blusas' },
  { match: /top/i, name: 'Tops' },
  { match: /remera/i, name: 'Remeras' },
  { match: /camisa|camisaco/i, name: 'Camisas' },
];

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&');
}

@Injectable()
export class ReirEnloquecerScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(ReirEnloquecerScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'Reír Enloquecer',
    slug: 'reir-enloquecer',
    websiteUrl: 'https://www.reirenloquecer.com',
    platform: 'TIENDANUBE',
    isKnownBrand: true,
  };

  private readonly sitemapUrl = 'https://www.reirenloquecer.com/sitemap.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 100;
    this.logger.log(
      `Iniciando scraping de Reír Enloquecer (límite: ${maxProducts} prendas)...`,
    );

    const productUrls = await this.fetchClothingUrlsFromSitemap();
    this.logger.log(
      `Detectadas ${productUrls.length} prendas de indumentaria en sitemap de Reír Enloquecer`,
    );

    const targetUrls = productUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga pausada con concurrency = 2 y delay jitter
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
      `Scraping de Reír Enloquecer finalizado: ${results.length} prendas recuperadas exitosamente`,
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
          /<loc>(https:\/\/www\.reirenloquecer\.com\/productos\/[^<]+)<\/loc>/g,
        ),
      ].map((m) => m[1]);

      return allUrls.filter((url) => {
        const lower = url.toLowerCase();
        if (lower === 'https://www.reirenloquecer.com/productos/') return false;
        return !NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
      });
    } catch (error) {
      this.logger.error(
        `Error al leer sitemap de Reír Enloquecer: ${(error as Error).message}`,
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
      const name = rawTitle.replace(/\s*\|\s*Reir/i, '').trim();
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
      let category = 'Indumentaria';
      for (const cat of CATEGORY_MAP) {
        if (cat.match.test(url) || cat.match.test(name)) {
          category = cat.name;
          break;
        }
      }

      // Extraer y limpiar descripción
      const descMatches = [
        ...html.matchAll(
          /<div[^>]*class=["'][^"']*user-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
        ),
      ];
      let rawDescription = '';
      for (const dm of descMatches) {
        const clean = dm[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (clean.length > rawDescription.length) {
          rawDescription = clean;
        }
      }
      const descriptionText = decodeHtmlEntities(rawDescription);

      // Composición:
      // Reír Enloquecer confecciona casi todo su catálogo en gabardina 100% algodón o denim 100% algodón.
      // Si es Blusa o Pantalón Ipanema forman conjunto en gabardina 100% algodón.
      const isIpanema = /ipanema/i.test(url) || /ipanema/i.test(name);
      const hasCottonExplicit =
        /100%\s*algod[oó]n|100%\s*denim|100%\s*gabardina|gabardina\s*de\s*algod[oó]n|poplin\s*de\s*algod[oó]n|tela\s*de\s*algod[oó]n|confeccionad[oa]\s*en\s*algod[oó]n/i.test(
          descriptionText,
        ) || isIpanema;

      let finalDescription = descriptionText;
      if (hasCottonExplicit) {
        if (!/composici[oó]n/i.test(descriptionText)) {
          finalDescription = `${descriptionText}\nComposición: 100% algodón.`;
        }
      } else if (/microtul/i.test(descriptionText)) {
        finalDescription = `${descriptionText}\nComposición: 100% poliéster (microtul).`;
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
        description: finalDescription,
        inStock: !isOutOfStock,
      };
    } catch (error) {
      this.logger.warn(
        `Error procesando prenda de Reír Enloquecer (${url}): ${(error as Error).message}`,
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
