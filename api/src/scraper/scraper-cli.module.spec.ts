import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperCliModule } from './scraper-cli.module';
import { ScraperService } from './scraper.service';

describe('Scraper CLI bootstrap (H01)', () => {
  it('keeps scraping available outside the HTTP API without contacting stores', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const context = await Test.createTestingModule({ imports: [ScraperCliModule] })
      .overrideProvider(PrismaService)
      .useValue({ brand: { upsert } })
      .compile();
    try {
      await context.init();
      expect(context.get(ScraperService)).toBeInstanceOf(ScraperService);
      expect(upsert).toHaveBeenCalled();
    } finally {
      await context.close();
    }
  });
});
