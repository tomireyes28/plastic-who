import { CompositionParserService } from '../composition/composition-parser.service';
import { TrafficLightService } from '../composition/traffic-light.service';
import { PrismaService } from '../prisma/prisma.service';
import { StoreScraperAdapter } from './interfaces/store-scraper-adapter.interface';
import { ScraperService } from './scraper.service';

describe('Parser results in the scraping pipeline (H04)', () => {
  it('persists uncertainty and lining evidence without counting partial data as classified', async () => {
    const descriptions = [
      'Composición: 5% algodón, 95% fibra desconocida',
      'Composición: Forro: 100% poliéster',
      'Composición: 50% algodón, poliéster 50%',
    ];
    const adapter: StoreScraperAdapter = {
      brandMetadata: { name: 'Fixture', slug: 'fixture', websiteUrl: 'https://example.invalid', platform: 'OTHER', isKnownBrand: false },
      scrapeCatalog: jest.fn().mockResolvedValue(descriptions.map((description, i) => ({
        externalId: String(i), name: `Fixture ${i}`, slug: `fixture-${i}`,
        productUrl: `https://example.invalid/${i}`, imageUrl: null, price: null,
        specialPrice: null, category: null, inStock: true, description,
      }))),
    };
    const prisma = {
      brand: { upsert: jest.fn().mockResolvedValue({ id: 'fixture', name: 'Fixture' }), update: jest.fn().mockResolvedValue({}) },
      product: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const service = new ScraperService(
      prisma as unknown as PrismaService,
      new CompositionParserService(new TrafficLightService()),
      [adapter],
    );
    const summary = await service.scrapeBrandBySlug('fixture');
    expect(summary).toMatchObject({ scrapedCount: 3, withCompositionCount: 1, withoutCompositionCount: 2 });
    const creates = prisma.product.upsert.mock.calls.map(([args]) => args.create);
    expect(creates[0]).toMatchObject({ trafficLight: 'UNKNOWN', naturalPercentage: 5, rawComposition: '5% algodón, 95% fibra desconocida' });
    expect(creates[0].fibers.create).toEqual([
      { fiberName: 'algodón', category: 'NATURAL', percentage: 5, isLining: false },
    ]);
    expect(creates[1]).toMatchObject({ trafficLight: 'UNKNOWN', hasSyntheticLining: true, naturalPercentage: 0 });
    expect(creates[2]).toMatchObject({ trafficLight: 'RED', naturalPercentage: 50, syntheticPercentage: 50 });
  });
});
