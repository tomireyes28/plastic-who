import { ParsedFiberItem, TrafficLightService } from './traffic-light.service';

describe('Traffic light policy (H05)', () => {
  const service = new TrafficLightService();
  const fiber = (
    fiberName: string, category: ParsedFiberItem['category'], percentage: number, isLining = false,
  ): ParsedFiberItem => ({ fiberName, category, percentage, isLining });

  const natural = fiber('lino', 'NATURAL', 100);

  it.each(['poliéster', 'poliamida', 'elastano'])
    ('downgrades a green exterior when the lining contains %s', (name) => {
      const result = service.evaluate([natural, fiber(name, 'SYNTHETIC', 1, true), fiber('algodón', 'NATURAL', 99, true)]);
      expect(result).toEqual({
        naturalPercentage: 100, semiSyntheticPercentage: 0, syntheticPercentage: 0,
        trafficLight: 'YELLOW', hasSyntheticLining: true,
      });
    });

  it.each([
    [],
    [fiber('algodón', 'NATURAL', 100, true)],
    [fiber('viscosa', 'SEMISYNTHETIC', 100, true)],
    [fiber('poliéster', 'SYNTHETIC', 0, true)],
  ])('keeps green without a positive synthetic lining', (...lining) => {
    expect(service.evaluate([natural, ...lining]).trafficLight).toBe('GREEN');
  });

  it.each(['elastano', 'poliéster', 'poliamida'])
    ('allows 5%% of %s in an otherwise natural exterior', (name) => {
      const exterior = [fiber('algodón', 'NATURAL', 95), fiber(name, 'SYNTHETIC', 5)];
      expect(service.evaluate(exterior).trafficLight).toBe('GREEN');
      expect(service.evaluate([...exterior, fiber('poliéster', 'SYNTHETIC', 100, true)]).trafficLight).toBe('YELLOW');
    });

  it('keeps a red exterior red even with a synthetic lining', () => {
    const result = service.evaluate([
      fiber('poliéster', 'SYNTHETIC', 100), fiber('poliéster', 'SYNTHETIC', 100, true),
    ]);
    expect(result.trafficLight).toBe('RED');
    expect(result.hasSyntheticLining).toBe(true);
  });

  it('keeps a yellow exterior yellow with a synthetic lining', () => {
    expect(service.evaluate([
      fiber('algodón', 'NATURAL', 80), fiber('poliéster', 'SYNTHETIC', 20),
      fiber('poliéster', 'SYNTHETIC', 100, true),
    ]).trafficLight).toBe('YELLOW');
  });

  it('does not classify an absent exterior from its lining', () => {
    expect(service.evaluate([fiber('poliéster', 'SYNTHETIC', 100, true)]).trafficLight).toBe('UNKNOWN');
  });
});
