import { renderToStaticMarkup } from 'react-dom/server';
jest.mock('../lib/catalog-source', () => ({ loadCatalog: jest.fn() }));
jest.mock('../components/CatalogExplorer', () => ({
  CatalogExplorer: () => <div>CatalogExplorer fixture</div>,
}));
import HomePage from './page';
import CatalogError from './error';
import { loadCatalog } from '../lib/catalog-source';
import { DEMO_BRANDS, DEMO_PRODUCTS } from '../data/demo-catalog';

describe('Catalog page states (H07)', () => {
  it('labels explicit demo data on the page', async () => {
    jest.mocked(loadCatalog).mockResolvedValueOnce({ mode: 'demo', brands: DEMO_BRANDS, products: DEMO_PRODUCTS });
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('Modo demostración');
    expect(html).toContain('No representan precios ni disponibilidad actuales');
  });
  it('renders empty data without examples', async () => {
    jest.mocked(loadCatalog).mockResolvedValueOnce({ mode: 'live', brands: [], products: [] });
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('no tiene prendas');
    expect(html).not.toContain('CatalogExplorer fixture');
    expect(html).not.toContain('Modo demostración');
  });
  it('propagates a source failure to the error boundary instead of rendering samples', async () => {
    jest.mocked(loadCatalog).mockRejectedValueOnce(new Error('CATALOG_UNAVAILABLE'));
    await expect(HomePage()).rejects.toThrow('CATALOG_UNAVAILABLE');
  });
  it('provides a full-navigation retry without connection details or local setup commands', () => {
    const html = renderToStaticMarkup(<CatalogError />);
    expect(html).toContain('No pudimos cargar el catálogo');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('npm run');
    expect(html).not.toContain('Supabase');
  });
});
