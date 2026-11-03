import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('Public API scraping isolation (H01)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const prisma = {
    brand: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
    product: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => { await app?.close(); });

  it.each(['/api/scraper/run-all', '/api/scraper/run/wanama'])
    ('does not expose %s', async (route) => {
      const response = await fetch(`${baseUrl}${route}?limit=1000`, { method: 'POST' });
      expect(response.status).toBe(404);
      expect(prisma.brand.upsert).not.toHaveBeenCalled();
      expect(prisma.product.upsert).not.toHaveBeenCalled();
    });

  it.each(['/api/health', '/api/brands', '/api/products', '/api/categories'])
    ('preserves read endpoint %s', async (route) => {
      const response = await fetch(`${baseUrl}${route}`);
      expect(response.status).toBe(200);
      await response.json();
    });

  it('does not register brands when the public API starts', () => {
    expect(prisma.brand.upsert).not.toHaveBeenCalled();
  });
});
