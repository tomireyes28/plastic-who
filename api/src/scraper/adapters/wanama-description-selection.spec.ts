import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CompositionAnalysisResult, CompositionParserService } from '../../composition/composition-parser.service';
import { TrafficLightService } from '../../composition/traffic-light.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScraperService } from '../scraper.service';
import { WanamaScraperAdapter } from './wanama-scraper.adapter';

interface SourceFixture {
  name: string;
  sourceUrl: string;
  capturedAt: string;
  description: string;
  briefDescription: string;
  expected: Pick<CompositionAnalysisResult,
    'trafficLight' | 'naturalPercentage' | 'semiSyntheticPercentage' | 'syntheticPercentage'> | null;
}

// Technical excerpts from saved public captures. Tests use neither the network nor DB.
const fixtures: SourceFixture[] = JSON.parse(readFileSync(
  join(__dirname, 'fixtures/wanama-description-selection.json'), 'utf8',
));

function productHtml(description?: string, briefDescription?: string, panel = ''): string {
  const payload = { item: {
    id: 123, title: 'Fixture', slug: 'fixture', description,
    brief_description: briefDescription, total_stock: 1,
  } };
  return `${panel}<script>self.__next_f.push([1,${JSON.stringify(JSON.stringify(payload))}])</script>`;
}

describe('Wanama description selection (H06 integration)', () => {
  const adapter = new WanamaScraperAdapter();
  const parser = new CompositionParserService(new TrafficLightService());
  const parse = (description?: string, brief?: string, panel = '') =>
    adapter.parseProductFromHtml(productHtml(description, brief, panel), 'fixture')!;

  it.each(fixtures)('keeps the primary declaration separate for $name', fixture => {
    const product = parse(fixture.description, fixture.briefDescription);
    expect(product.description).toBe(fixture.description);
    if (fixture.expected) {
      expect(parser.parseFromText(product.description)).toMatchObject(fixture.expected);
    } else {
      // Microfibra's category is a separate open policy issue; preserve the source label.
      expect(product.description).toContain('100% MICROFIBRA');
    }
  });

  it.each([undefined, '', ' \r\n\t '])('uses the brief only when primary is empty: %p', description => {
    const product = parse(description, 'Composición: 100% lino');
    expect(product.description).toBe('Composición: 100% lino');
    expect(parser.parseFromText(product.description).trafficLight).toBe('GREEN');
  });

  it('does not supplement an incomplete primary with a complete brief', () => {
    const product = parse('Composición: 80% algodón', 'Composición: 100% algodón');
    expect(parser.parseFromText(product.description)).toMatchObject({ trafficLight: 'UNKNOWN', naturalPercentage: 80 });
  });

  it('does not replace a primary lacking percentages with a quantified brief', () => {
    const product = parse('Prenda de algodón, sin porcentajes.', 'Composición: 100% poliéster');
    expect(product.description).toBe('Prenda de algodón, sin porcentajes.');
    expect(parser.parseFromText(product.description).trafficLight).toBe('UNKNOWN');
  });

  it('preserves lining in the primary even when the brief only describes the exterior', () => {
    const product = parse('Exterior: 100% lino\nForro: 100% poliéster', 'Exterior: 100% lino');
    expect(parser.parseFromText(product.description)).toMatchObject({ trafficLight: 'YELLOW', hasSyntheticLining: true });
  });

  it('keeps an independently declared composition panel together with the primary', () => {
    const product = parse('Exterior: 100% lino', 'Composición: 100% algodón',
      '<div id="panel-composicion">Forro: 100% poliéster</div>');
    expect(product.description).toBe('Composición: Forro: 100% poliéster\nExterior: 100% lino');
    expect(parser.parseFromText(product.description)).toMatchObject({ trafficLight: 'YELLOW', hasSyntheticLining: true });
  });

  it('does not suppress conflicts between the independent panel and primary', () => {
    const product = parse('Composición: 100% algodón', 'Composición: 100% algodón',
      '<div id="panel-composicion">Exterior: 100% poliéster</div>');
    expect(parser.parseFromText(product.description).trafficLight).toBe('UNKNOWN');
  });

  it('keeps panel evidence with a brief fallback when there is no primary', () => {
    const product = parse(undefined, 'Exterior: 100% lino',
      '<div id="panel-composicion">Forro: 100% poliéster</div>');
    expect(parser.parseFromText(product.description)).toMatchObject({ trafficLight: 'YELLOW', hasSyntheticLining: true });
  });

  it('does not fabricate composition when both descriptions are empty', () => {
    const product = parse(' \n ', '\t');
    expect(product.description).toBe('');
    expect(parser.parseFromText(product.description).trafficLight).toBe('UNKNOWN');
  });

  it('passes only the selected source through the scraping pipeline with mocked persistence', async () => {
    const fixture = fixtures.find(row => row.name === 'Polera America I')!;
    const product = parse(fixture.description, fixture.briefDescription);
    const catalog = jest.spyOn(adapter, 'scrapeCatalog').mockResolvedValue([product]);
    const prisma = {
      brand: { upsert: jest.fn().mockResolvedValue({ id: 'fixture', name: 'Wanama' }), update: jest.fn().mockResolvedValue({}) },
      product: { upsert: jest.fn().mockResolvedValue({}) },
    };
    try {
      const service = new ScraperService(prisma as unknown as PrismaService, parser, [adapter]);
      const summary = await service.scrapeBrandBySlug('wanama');
      expect(summary).toMatchObject({ scrapedCount: 1, withCompositionCount: 1, withoutCompositionCount: 0 });
      const args = prisma.product.upsert.mock.calls[0][0];
      for (const state of [args.create, args.update]) {
        expect(state).toMatchObject({ description: fixture.description, trafficLight: 'RED', syntheticPercentage: 100 });
        expect(state.rawComposition).not.toContain('COMPOSICION:');
      }
      expect(args.create.fibers.create).toEqual([
        { fiberName: 'acrílico', category: 'SYNTHETIC', percentage: 80, isLining: false },
        { fiberName: 'poliamida', category: 'SYNTHETIC', percentage: 20, isLining: false },
      ]);
    } finally {
      catalog.mockRestore();
    }
  });
});
