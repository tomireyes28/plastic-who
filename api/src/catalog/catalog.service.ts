import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

const MAIN_NATURAL_FIBERS = ['algodón', 'lino', 'lana'];

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getBrands() {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ isKnownBrand: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      websiteUrl: b.websiteUrl,
      platform: b.platform,
      isKnownBrand: b.isKnownBrand,
      lastScrapedAt: b.lastScrapedAt ? b.lastScrapedAt.toISOString() : null,
      productCount: b._count.products,
    }));
  }

  async getProducts(query: GetProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (query.brandSlug) {
      where.brand = {
        slug: query.brandSlug.toLowerCase().trim(),
      };
    }

    if (query.trafficLight) {
      where.trafficLight = query.trafficLight;
    }

    if (
      typeof query.minNaturalPct === 'number' &&
      Number.isFinite(query.minNaturalPct)
    ) {
      where.naturalPercentage = {
        gte: query.minNaturalPct,
      };
    }

    if (query.category) {
      where.category = {
        equals: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    if (query.fiber) {
      const normalizedFiber = query.fiber.toLowerCase().trim();
      if (
        normalizedFiber === 'otros naturales' ||
        normalizedFiber === 'otros-naturales'
      ) {
        where.fibers = {
          some: {
            isLining: false,
            category: 'NATURAL',
            fiberName: { notIn: MAIN_NATURAL_FIBERS },
            percentage: { gt: 0 },
          },
        };
      } else {
        where.fibers = {
          some: {
            isLining: false,
            fiberName: {
              equals: normalizedFiber,
              mode: 'insensitive',
            },
            percentage: { gt: 0 },
          },
        };
      }
    }

    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 5000) : 5000;

    return this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: [{ naturalPercentage: 'desc' }, { updatedAt: 'desc' }],
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        fibers: {
          orderBy: [{ isLining: 'asc' }, { percentage: 'desc' }],
        },
      },
    });
  }

  async getCategories(brandSlug?: string): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        isActive: true,
        category: { not: null },
        ...(brandSlug
          ? { brand: { slug: brandSlug.toLowerCase().trim() } }
          : {}),
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return rows
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c));
  }
}
