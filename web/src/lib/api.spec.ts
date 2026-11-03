jest.mock('./prisma', () => ({ prisma: { product: { findMany: jest.fn() } } }));
import { prisma } from './prisma';
import { fetchProducts } from './api';
const old = process.env.DATABASE_URL;
describe('Product filters on both sources (H12)', () => {
  afterEach(() => { jest.restoreAllMocks(); if (old === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = old; });
  it('filters unknowns, category, search and exterior fiber before taking results', async () => {
    process.env.DATABASE_URL = 'fixture-only';
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    await fetchProducts({ brand: ' WANAMA ', trafficLight: 'UNKNOWN', fiber: 'LINO', category: 'Vestidos', search: 'Camisa', limit: 20 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20, where: expect.objectContaining({
      brand: { slug: 'wanama' }, trafficLight: 'UNKNOWN', category: { equals: 'Vestidos', mode: 'insensitive' },
      name: { contains: 'Camisa', mode: 'insensitive' }, fibers: { some: { isLining: false, percentage: { gt: 0 }, fiberName: { equals: 'lino', mode: 'insensitive' } } },
    }) }));
  });
  it('forwards encoded filter parameters to the API', async () => {
    delete process.env.DATABASE_URL;
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('[]'));
    await fetchProducts({ trafficLight: 'UNKNOWN', fiber: 'algodón', search: 'a & b' });
    const query = new URL(fetcher.mock.calls[0][0] as string).searchParams;
    expect(query.get('trafficLight')).toBe('UNKNOWN'); expect(query.get('fiber')).toBe('algodón'); expect(query.get('search')).toBe('a & b');
  });
});
