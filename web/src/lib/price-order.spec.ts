import { comparePrice } from './price-order';
describe('Displayed effective price ordering (H24)', () => {
  it('sorts the promotion price rather than the crossed out list price', () => {
    const sale = { price: 100, specialPrice: 10 }, normal = { price: 50, specialPrice: null };
    expect(comparePrice(sale, normal)).toBeLessThan(0);
    expect(comparePrice(sale, normal, true)).toBeGreaterThan(0);
  });
  it('keeps missing or invalid prices last in either direction and ties missing prices', () => {
    const missing = { price: null, specialPrice: null }, normal = { price: 50, specialPrice: null };
    expect(comparePrice(missing, missing)).toBe(0);
    expect(comparePrice(missing, normal)).toBeGreaterThan(0);
    expect(comparePrice(missing, normal, true)).toBeGreaterThan(0);
    expect(comparePrice({ price: NaN, specialPrice: -1 }, normal)).toBeGreaterThan(0);
  });
});
