jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('./api', () => ({ fetchBrands: jest.fn(), fetchProducts: jest.fn() }));
import { fetchBrands, fetchProducts } from './api';
import { DEMO_BRANDS, DEMO_PRODUCTS } from '../data/demo-catalog';
import { CatalogUnavailableError, loadCatalog } from './catalog-source';

describe('Catalog source policy (H07)', () => {
  const brands = jest.mocked(fetchBrands);
  const products = jest.mocked(fetchProducts);
  const oldMode = process.env.CATALOG_MODE;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.CATALOG_MODE;
    brands.mockResolvedValue(DEMO_BRANDS);
    products.mockResolvedValue(DEMO_PRODUCTS);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (oldMode === undefined) delete process.env.CATALOG_MODE;
    else process.env.CATALOG_MODE = oldMode;
  });

  it('reads the configured live source by default', async () => {
    expect((await loadCatalog()).mode).toBe('live');
    expect(brands).toHaveBeenCalledTimes(1);
    expect(products).toHaveBeenCalledWith({ limit: 5000 });
  });
  it('only selects demo explicitly, without querying the source', async () => {
    process.env.CATALOG_MODE = 'demo';
    expect(await loadCatalog()).toEqual({ mode: 'demo', brands: DEMO_BRANDS, products: DEMO_PRODUCTS });
    expect(brands).not.toHaveBeenCalled();
    expect(products).not.toHaveBeenCalled();
  });
  it.each(['brands', 'products'])('does not publish examples when %s fails', async field => {
    (field === 'brands' ? brands : products).mockRejectedValueOnce(new Error('private connection details'));
    await expect(loadCatalog()).rejects.toBeInstanceOf(CatalogUnavailableError);
    expect(console.error).toHaveBeenCalledWith('[catalog] source_unavailable');
    expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toContain('private connection details');
  });
  it('preserves a genuinely empty catalog', async () => {
    brands.mockResolvedValue([]);
    products.mockResolvedValue([]);
    expect(await loadCatalog()).toEqual({ mode: 'live', brands: [], products: [] });
  });
  it('does not manufacture brands when only products are returned', async () => {
    brands.mockResolvedValue([]);
    expect((await loadCatalog()).brands).toEqual([]);
  });
  it('fetches anew on each invocation instead of freezing the first result', async () => {
    products.mockResolvedValueOnce([DEMO_PRODUCTS[0]]).mockResolvedValueOnce([DEMO_PRODUCTS[1]]);
    expect((await loadCatalog()).products[0].id).toBe(DEMO_PRODUCTS[0].id);
    expect((await loadCatalog()).products[0].id).toBe(DEMO_PRODUCTS[1].id);
    expect(products).toHaveBeenCalledTimes(2);
  });
  it('fails closed on an invalid mode rather than silently selecting demo', async () => {
    await expect(loadCatalog('preview')).rejects.toBeInstanceOf(CatalogUnavailableError);
    expect(brands).not.toHaveBeenCalled();
  });
  it('rejects malformed source responses', async () => {
    products.mockResolvedValueOnce(null as unknown as typeof DEMO_PRODUCTS);
    await expect(loadCatalog()).rejects.toBeInstanceOf(CatalogUnavailableError);
  });
});
