import { BrandSummary, ProductCardItem, TrafficLightColor } from '../types/catalog';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ProductFilters {
  brand?: string;
  fiber?: string;
  trafficLight?: TrafficLightColor | 'ALL';
  category?: string;
  search?: string;
}

export async function fetchBrands(): Promise<BrandSummary[]> {
  const res = await fetch(`${API_BASE_URL}/brands`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error al obtener marcas (${res.status})`);
  }
  return res.json();
}

export async function fetchProducts(
  filters: ProductFilters = {},
): Promise<ProductCardItem[]> {
  const params = new URLSearchParams();
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.fiber) params.set('fiber', filters.fiber);
  if (filters.trafficLight && filters.trafficLight !== 'ALL') {
    params.set('trafficLight', filters.trafficLight);
  }
  if (filters.category && filters.category !== 'TODAS') {
    params.set('category', filters.category);
  }
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/products${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
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
