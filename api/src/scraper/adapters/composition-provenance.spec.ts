import { CompositionParserService } from '../../composition/composition-parser.service';
import { TrafficLightService } from '../../composition/traffic-light.service';
import { FunkyMonkeysScraperAdapter } from './funky-monkeys-scraper.adapter';
import { OnePlaceWorldScraperAdapter } from './one-place-world-scraper.adapter';
import { ReirEnloquecerScraperAdapter } from './reir-enloquecer-scraper.adapter';

describe('Declared composition provenance (H02)', () => {
  const parser = new CompositionParserService(new TrafficLightService());
  afterEach(() => jest.restoreAllMocks());

  const sources = [
    { adapter: new OnePlaceWorldScraperAdapter(), slug: 'remera-bambu', title: 'Remera Bambú' },
    { adapter: new ReirEnloquecerScraperAdapter(), slug: 'blusa-ipanema', title: 'Blusa Ipanema' },
    { adapter: new FunkyMonkeysScraperAdapter(), slug: 'rompevientos', title: 'Rompevientos' },
  ];

  describe.each(sources)('$adapter.brandMetadata.slug', ({ adapter, slug, title }) => {
    const url = `${adapter.brandMetadata.websiteUrl}/productos/${slug}/`;

    async function read(description: string) {
      const html = `<meta property="og:title" content="${title}">
        <div class="js-product-description user-content">${description}</div>`;
      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(html));
      const product = await adapter.fetchProductDetail(url);
      expect(product).not.toBeNull();
      return product!;
    }

    it('does not manufacture percentages from a product name', async () => {
      const product = await read('');
      expect(product.description).toBe('');
      expect(parser.parseFromText(product.description).trafficLight).toBe('UNKNOWN');
    });

    it.each([
      'Confeccionada en algodón',
      '100% denim y gabardina',
      'Microtul',
      'Rompevientos con forro de jersey de algodón',
    ])('preserves an unquantified or non-fiber declaration: %s', async (description) => {
      const product = await read(description);
      expect(product.description.trim()).toBe(description);
      expect(parser.parseFromText(product.description).trafficLight).toBe('UNKNOWN');
    });

    it('preserves explicit percentages instead of replacing them with a brand assumption', async () => {
      const description = 'Composición: 80% algodón, 20% poliéster';
      const product = await read(description);
      expect(product.description.trim()).toBe(description);
      const result = parser.parseFromText(product.description);
      expect(result.naturalPercentage).toBe(80);
      expect(result.syntheticPercentage).toBe(20);
    });
  });

  it('reads One Place World metadata when the description container is absent', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(
      '<meta property="og:title" content="Remera Bambú"><meta property="og:description" content="Composición: 80% algodón, 20% poliéster">',
    ));
    const product = await new OnePlaceWorldScraperAdapter().fetchProductDetail('https://oneplaceworld.com/productos/remera-bambu/');
    expect(parser.parseFromText(product!.description).naturalPercentage).toBe(80);
  });
});
