import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let prismaMock: {
    brand: { findMany: jest.Mock };
    product: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prismaMock = {
      brand: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new CatalogService(prismaMock as unknown as PrismaService);
  });

  it('debe filtrar productos por marca y semáforo ordenados por % natural descendente', async () => {
    await service.getProducts({
      brandSlug: 'wanama',
      trafficLight: 'GREEN',
    });

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          brand: { slug: 'wanama' },
          trafficLight: 'GREEN',
        },
        orderBy: [{ naturalPercentage: 'desc' }, { updatedAt: 'desc' }],
      }),
    );
  });

  it('debe filtrar por "otros naturales" excluyendo algodón, lino y lana', async () => {
    await service.getProducts({
      fiber: 'otros naturales',
    });

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          fibers: {
            some: {
              isLining: false,
              category: 'NATURAL',
              fiberName: { notIn: ['algodón', 'lino', 'lana'] },
              percentage: { gt: 0 },
            },
          },
        },
      }),
    );
  });
});
