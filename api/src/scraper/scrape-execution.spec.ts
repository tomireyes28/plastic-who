import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireScrapeLock, parseScrapeArguments } from './scrape-execution';
import { fetchStore } from './fetch-store';
import { ScraperService } from './scraper.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompositionParserService } from '../composition/composition-parser.service';
import { TrafficLightService } from '../composition/traffic-light.service';

describe('Scrape execution safeguards (H10)', () => {
  it.each(['0', '-1', '1001', '12junk', '1.5', '$(x)'])('rejects invalid limits before startup: %s', maximum => {
    expect(() => parseScrapeArguments('all', maximum)).toThrow();
  });
  it('accepts bounded arguments', () => expect(parseScrapeArguments('wanama,markova', '40')).toEqual({ target: 'wanama,markova', maxProducts: 40 }));
  it('prevents overlapping work in one workspace and releases only its own lock', () => {
    const folder = mkdtempSync(join(tmpdir(), 'plasticwho-lock-'));
    const file = join(folder, '.scrape.lock');
    try {
      const release = acquireScrapeLock(file);
      expect(() => acquireScrapeLock(file)).toThrow();
      release(); const releaseNext = acquireScrapeLock(file);
      release(); expect(() => acquireScrapeLock(file)).toThrow(); releaseNext();
    } finally {
      if (!folder.startsWith(join(tmpdir(), 'plasticwho-lock-'))) throw new Error('Unexpected test cleanup path');
      rmSync(folder, { recursive: true, force: true });
    }
  });
  it('passes a bounded abort signal to the fetch implementation', async () => {
    const controller = new AbortController(); controller.abort();
    const read = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('fixture'));
    try {
      await fetchStore('https://example.invalid', { signal: controller.signal, headers: { Accept: 'text/html' } });
      expect(read.mock.calls[0][1]?.signal?.aborted).toBe(true);
      expect(read.mock.calls[0][1]?.headers).toEqual({ Accept: 'text/html' });
    } finally { read.mockRestore(); }
  });
  it('does not report an empty/failed extraction as a fresh brand', async () => {
    const prisma = { brand: { upsert: jest.fn().mockResolvedValue({ id: 'fixture' }), update: jest.fn() }, product: { upsert: jest.fn() } };
    const service = new ScraperService(prisma as unknown as PrismaService,
      new CompositionParserService(new TrafficLightService()), [{
        brandMetadata: { name: 'Fixture', slug: 'fixture', websiteUrl: 'https://example.invalid', platform: 'OTHER', isKnownBrand: false },
        scrapeCatalog: jest.fn().mockResolvedValue([]),
      }]);
    await expect(service.scrapeBrandBySlug('fixture')).rejects.toThrow('No products');
    expect(prisma.brand.update).not.toHaveBeenCalled(); expect(prisma.product.upsert).not.toHaveBeenCalled();
  });
});
