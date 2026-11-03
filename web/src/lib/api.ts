import {
  BrandSummary,
  FiberCategory,
  ProductCardItem,
  TrafficLightColor,
} from '../types/catalog';
import { prisma } from './prisma';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ProductFilters {
  brand?: string;
  fiber?: string;
  trafficLight?: TrafficLightColor | 'ALL';
  category?: string;
  search?: string;
  limit?: number;
}

/**
 * Obtiene las marcas activas leyendo directo de Supabase (Server Component)
 * o a través de la API NestJS si se configuró NEXT_PUBLIC_API_URL.
 */
export async function fetchBrands(): Promise<BrandSummary[]> {
  if (process.env.DATABASE_URL) {
    const rows = await prisma.brand.findMany({
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

    return rows.map((b) => ({
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

  const baseUrl = process.env.CATALOG_API_URL || API_BASE_URL || 'http://localhost:3001/api';
  const res = await fetch(`${baseUrl}/brands`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`Error al obtener marcas (${res.status})`);
  }
  return res.json();
}

/**
 * Obtiene las prendas activas leyendo directo de Supabase (Server Component)
 * o desde la API NestJS como alternativa.
 */
export async function fetchProducts(
  filters: ProductFilters = {},
): Promise<ProductCardItem[]> {
  const limit = Number.isInteger(filters.limit) && filters.limit! > 0 ? Math.min(filters.limit!, 5000) : 5000;
  const fiber = filters.fiber?.toLowerCase().trim();

  if (process.env.DATABASE_URL) {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(filters.brand ? { brand: { slug: filters.brand.toLowerCase().trim() } } : {}),
        ...(filters.trafficLight && filters.trafficLight !== 'ALL' ? { trafficLight: filters.trafficLight } : {}),
        ...(filters.category ? { category: { equals: filters.category.trim(), mode: 'insensitive' as const } } : {}),
        ...(filters.search ? { name: { contains: filters.search.trim(), mode: 'insensitive' as const } } : {}),
        ...(fiber ? { fibers: { some: { isLining: false, percentage: { gt: 0 },
          ...(fiber === 'otros naturales' || fiber === 'otros-naturales'
            ? { category: 'NATURAL' as const, fiberName: { notIn: ['algodón', 'lino', 'lana'] } }
            : { fiberName: { equals: fiber, mode: 'insensitive' as const } }),
        } } } : {}),
      },
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

    return rows.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      name: p.name,
      slug: p.slug,
      productUrl: p.productUrl,
      imageUrl: p.imageUrl,
      price: p.price,
      specialPrice: p.specialPrice,
      category: p.category,
      rawComposition: p.rawComposition,
      naturalPercentage: p.naturalPercentage,
      semiSyntheticPercentage: p.semiSyntheticPercentage,
      syntheticPercentage: p.syntheticPercentage,
      trafficLight: p.trafficLight as TrafficLightColor,
      hasSyntheticLining: p.hasSyntheticLining,
      inStock: p.inStock,
      brand: p.brand,
      fibers: p.fibers.map((f) => ({
        id: f.id,
        fiberName: f.fiberName,
        category: f.category as FiberCategory,
        percentage: f.percentage,
        isLining: f.isLining,
      })),
    }));
  }

  const baseUrl = process.env.CATALOG_API_URL || API_BASE_URL || 'http://localhost:3001/api';
  const params = new URLSearchParams({ limit: String(limit) });
  for (const field of ['brand', 'fiber', 'category', 'search'] as const) if (filters[field]?.trim()) params.set(field, filters[field]!.trim());
  if (filters.trafficLight && filters.trafficLight !== 'ALL') params.set('trafficLight', filters.trafficLight);
  const res = await fetch(`${baseUrl}/products?${params}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Error al obtener prendas (${res.status})`);
  }
  return res.json();
}

