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

  const baseUrl = API_BASE_URL || 'http://localhost:3001/api';
  const res = await fetch(`${baseUrl}/brands`, { cache: 'no-store' });
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
  const limit = filters.limit ?? 150;

  if (process.env.DATABASE_URL) {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(filters.brand ? { brand: { slug: filters.brand } } : {}),
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

  const baseUrl = API_BASE_URL || 'http://localhost:3001/api';
  const res = await fetch(`${baseUrl}/products?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error al obtener prendas (${res.status})`);
  }
  return res.json();
}

export function formatArsPrice(amount: number | null): string | null {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}
