import 'server-only';
import { DEMO_BRANDS, DEMO_PRODUCTS } from '../data/demo-catalog';
import { fetchBrands, fetchProducts } from './api';

export class CatalogUnavailableError extends Error {
  constructor() { super('CATALOG_UNAVAILABLE'); this.name = 'CatalogUnavailableError'; }
}

/** Live is the default. Demo is an explicit source, never a recovery from failure. */
export async function loadCatalog(mode = process.env.CATALOG_MODE ?? 'live') {
  if (mode === 'demo') return { mode: 'demo' as const, brands: DEMO_BRANDS, products: DEMO_PRODUCTS };
  if (mode !== 'live') {
    console.error('[catalog] invalid_mode');
    throw new CatalogUnavailableError();
  }
  try {
    const [brands, products] = await Promise.all([fetchBrands(), fetchProducts({ limit: 5000 })]);
    if (!Array.isArray(brands) || !Array.isArray(products)) throw new Error('Invalid catalog response');
    return { mode: 'live' as const, brands, products };
  } catch {
    // Provider errors can include connection details. Log a stable, non-sensitive event.
    console.error('[catalog] source_unavailable');
    throw new CatalogUnavailableError();
  }
}
