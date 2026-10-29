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
  'sobre-',
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
  'colita',
  'scrunchie',
  'pin-',
  'clip',
  'porta',
  'funda',
  'almohadon',
  'manta',
  'cuaderno',
];

const CATEGORY_KEYWORDS: Array<{ match: RegExp; name: string }> = [
  { match: /camisa/i, name: 'Camisas' },
  { match: /remera|t-shirt/i, name: 'Remeras' },
  { match: /vestido/i, name: 'Vestidos' },
  { match: /jean|denim/i, name: 'Jeans' },
  { match: /pantalon/i, name: 'Pantalones' },
  { match: /sweater|tejido|cardigan|pullover/i, name: 'Sweaters' },
  { match: /buzo/i, name: 'Buzos' },
  { match: /campera|tapado|trench|blazer|saco/i, name: 'Camperas y Abrigos' },
  { match: /chaleco/i, name: 'Chalecos' },
  { match: /short/i, name: 'Shorts' },
  { match: /falda|pollera/i, name: 'Faldas' },
  { match: /top|musculosa/i, name: 'Tops' },
  { match: /mono/i, name: 'Monos' },
];

@Injectable()
export class RapsodiaScraperAdapter implements StoreScraperAdapter {
  private readonly logger = new Logger(RapsodiaScraperAdapter.name);

  readonly brandMetadata: BrandScraperMetadata = {
    name: 'Rapsodia',
    slug: 'rapsodia',
    websiteUrl: 'https://www.rapsodia.com.ar',
    platform: 'OTHER',
    isKnownBrand: true,
  };

  private readonly sitemapUrl =
    'https://www.rapsodia.com.ar/media/sitemap-rapsodia-ar/sitemap.xml';

  async scrapeCatalog(options?: ScrapeOptions): Promise<ScrapedProductRaw[]> {
    const maxProducts = options?.maxProducts ?? 500;
    this.logger.log(
      `Iniciando scraping de Rapsodia (límite: ${maxProducts} prendas)...`,
    );

    const clothingUrls = await this.fetchClothingUrlsFromSitemap();
    this.logger.log(
      `Detectadas ${clothingUrls.length} prendas de indumentaria candidatas en Rapsodia`,
    );

    const targetUrls = clothingUrls.slice(0, maxProducts);
    const results: ScrapedProductRaw[] = [];

    // Descarga tranquila y controlada (concurrency = 2 o 3 con jitter delay para no despertar Cloudflare/WAF)
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

      // Pausa aleatoria natural entre batches (250ms - 450ms)
      if (i + chunkSize < targetUrls.length) {
        const delay = 250 + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.logger.log(
      `Scraping de Rapsodia finalizado: ${results.length} prendas recuperadas exitosamente`,
    );
    return results;
  }

  async fetchClothingUrlsFromSitemap(): Promise<string[]> {
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
      const allUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1],
      );

      // En Magento de Rapsodia, los productos tienen URLs en la raíz con código numérico (ej: 11115531328p02-camisa-boy-white-denim.html)
      const productRegex = /\/\d{4,}[a-z0-9_-]+\.html$/i;
      const candidateUrls = allUrls.filter((u) => productRegex.test(u));

      // Filtrar calzado y accesorios, y ordenar del más reciente al más antiguo
      return candidateUrls
        .filter((url) => {
          const lower = url.toLowerCase();
          return !NON_CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
        })
        .reverse();
    } catch (error) {
      this.logger.error(
        `Error al leer sitemap de Rapsodia: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchProductDetail(url: string): Promise<ScrapedProductRaw | null> {
    try {
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
        'Sec-Ch-Ua':
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      };

      let res = await fetch(url, { headers });

      // Si responde 429 o 503, esperar 2.5s y reintentar una vez
      if (res.status === 429 || res.status === 503) {
        this.logger.warn(`Pausa por rate-limit (${res.status}) en ${url}...`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
        res = await fetch(url, { headers });
      }

      if (!res.ok) {
        this.logger.warn(`Error ${res.status} al obtener ${url}`);
        return null;
      }

      const html = await res.text();

      // 1. Título
      const titleMatch =
        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
        html.match(/<span class="base"[^>]*>([\s\S]*?)<\/span>/i);
      const name = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'Prenda Rapsodia';

      // 2. Precio
      const priceMatch =
        html.match(/"finalPrice":\{"amount":([0-9.]+)/i) ||
        html.match(/data-price-amount="([0-9.]+)"/i) ||
        html.match(/"price":\s*"?([0-9.]+)"?/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      // 3. Imagen
      const imgMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i) ||
        html.match(/"full":\s*"([^"]+)"/i);
      const imageUrl = imgMatch ? imgMatch[1].replace(/\\/g, '') : null;

      // 4. Material y Cuidados
      const matMatch = html.match(/data-th="Material">([^<]*)</i);
      const material = matMatch ? matMatch[1].trim() : null;

      const cuidadosMatch = html.match(/data-th="Cuidados">([^<]*)</i);
      const cuidados = cuidadosMatch ? cuidadosMatch[1].trim() : null;

      // Descripción abierta
      const descMatch = html.match(
        /class="product attribute description"[^>]*>([\s\S]*?)<\/div>/i,
      );
      const bodyDesc = descMatch
        ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

      const description = [
        material ? `Composición: ${material}` : null,
        bodyDesc || null,
        cuidados ? `Cuidados: ${cuidados}` : null,
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

      // 7. Stock
      const isOutOfStock =
        html.includes('class="stock unavailable"') ||
        html.includes('"is_in_stock":false') ||
        html.includes('"is_salable":false') ||
        html.includes('>Agotado<') ||
        html.includes('>Sin stock<');

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
        inStock: !isOutOfStock,
      };
    } catch (error) {
      this.logger.warn(
        `Error procesando prenda de Rapsodia (${url}): ${(error as Error).message}`,
      );
      return null;
    }
  }
}
