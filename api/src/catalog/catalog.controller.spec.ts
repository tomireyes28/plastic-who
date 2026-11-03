import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
describe('Catalog query contract (H12)', () => {
  const getProducts = jest.fn();
  const controller = new CatalogController({ getProducts } as unknown as CatalogService);
  it('supports the UNKNOWN filter', () => {
    controller.getProducts(undefined, undefined, 'unknown');
    expect(getProducts).toHaveBeenLastCalledWith(expect.objectContaining({ trafficLight: 'UNKNOWN' }));
  });
  it('rejects malformed filters rather than silently returning unfiltered results', () => {
    expect(() => controller.getProducts(undefined, undefined, 'oops')).toThrow();
    expect(() => controller.getProducts(undefined, undefined, undefined, undefined, undefined, undefined, '12junk')).toThrow();
  });
});
