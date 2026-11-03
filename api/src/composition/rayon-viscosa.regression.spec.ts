import { CompositionParserService } from './composition-parser.service';
import { resolveFiber } from './fiber-dictionary';
import { TrafficLightService } from './traffic-light.service';

describe('Rayón viscosa compound label (H06 integration)', () => {
  const parser = new CompositionParserService(new TrafficLightService());

  it.each(['rayón viscosa', 'RAYON VISCOSA', 'rayón   viscosa', 'RAYO\u0301N\tVISCOSA'])
    ('resolves the compound alias %s to viscose', name => {
      expect(resolveFiber(name)).toEqual({ canonicalName: 'viscosa', category: 'SEMISYNTHETIC' });
    });

  // Three technical forms found in the H06 catalog review, plus ordering/spacing variants.
  it.each([
    '80% RAYÓN VISCOSA 20% POLIAMIDA',
    '80% RAYÓN VISCOSA - 20% POLIAMIDA',
    'RAYÓN VISCOSA 80%, POLIAMIDA 20%',
    'RAYON VISCOSA 80%, 20% nylon',
    '80% RAYÓN\t VISCOSA, 20% poliamida',
    '80% rayón&nbsp;viscosa, 20% poliamida',
    '80% rayón\nviscosa\n20% poliamida',
  ])('assigns one quantity to the full label: %s', composition => {
    const result = parser.parseFromText('Composición: ' + composition);
    expect(result).toMatchObject({
      trafficLight: 'YELLOW', naturalPercentage: 0,
      semiSyntheticPercentage: 80, syntheticPercentage: 20,
    });
    expect(result.fibers).toEqual([
      { fiberName: 'viscosa', category: 'SEMISYNTHETIC', percentage: 80, isLining: false },
      { fiberName: 'poliamida', category: 'SYNTHETIC', percentage: 20, isLining: false },
    ]);
  });

  it('recognizes the catalog 96/4 blend without rewriting the source label', () => {
    const result = parser.parseFromText('Composición: 96% RAYÓN VISCOSA - 4% ELASTANO');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', semiSyntheticPercentage: 96, syntheticPercentage: 4 });
    expect(result.fibers).toHaveLength(2);
    expect(result.rawComposition).toBe('96% RAYÓN VISCOSA - 4% ELASTANO');
  });

  it('recognizes a full declaration with the percentage after the compound alias', () => {
    const result = parser.parseFromText('Composición: RAYÓN VISCOSA 100%');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', semiSyntheticPercentage: 100 });
    expect(result.fibers).toHaveLength(1);
  });

  it('preserves separate amounts assigned to the two independent aliases', () => {
    const result = parser.parseFromText('Composición: 40% rayón, 40% viscosa, 20% poliamida');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', semiSyntheticPercentage: 80, syntheticPercentage: 20 });
    expect(result.fibers).toHaveLength(2);
  });

  it('does not complete a partial declaration just because the label has two words', () => {
    const result = parser.parseFromText('Composición: 80% rayón viscosa');
    expect(result).toMatchObject({ trafficLight: 'UNKNOWN', semiSyntheticPercentage: 80 });
    expect(result.fibers).toHaveLength(1);
  });

  it('rejects excess percentages instead of normalizing them', () => {
    const result = parser.parseFromText('Composición: 100% rayón viscosa, 10% algodón');
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.fibers).toEqual([]);
  });

  it('keeps unquantified extra fibers uncertain', () => {
    expect(parser.parseFromText('Composición: 80% rayón viscosa, 20% algodón, poliéster').trafficLight).toBe('UNKNOWN');
  });

  it('does not merge different fiber names into the compound alias', () => {
    expect(parser.parseFromText('Composición: 100% rayón algodón').trafficLight).toBe('UNKNOWN');
  });

  it.each([
    ['65% RAYÓN VISCOSA 35% POLIÉSTER', 0, 65, 35],
    ['47.5% ALGODÓN - 47.5% RAYÓN VISCOSA - 5% ELASTANO', 47.5, 47.5, 5],
    ['70% ALGODÓN - 25.5% POLIÉSTER - 3% RAYÓN VISCOSA - 1.5% ELASTANO', 70, 3, 27],
  ] as const)('preserves quantities in another catalog blend: %s', (text, natural, semi, synthetic) => {
    const result = parser.parseFromText('Composición: ' + text);
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: natural,
      semiSyntheticPercentage: semi, syntheticPercentage: synthetic });
    expect(result.fibers.filter(f => f.fiberName === 'viscosa')).toHaveLength(1);
    expect(result.fibers.reduce((sum, f) => sum + f.percentage, 0)).toBe(100);
  });

  it.each([
    '77% RAYÓN VISCOSA - 16% POLIÉSTER - 7% FIBRA METÁLICA',
    'Base: 70% algodón - 25 - 5% poliéster - 3% rayón viscosa - 1 - 5% elastano - forrería: 100% algodón',
  ])('does not classify other unresolved catalog formats after recognizing the alias: %s', text => {
    expect(parser.parseFromText('Composición: ' + text).trafficLight).toBe('UNKNOWN');
  });

  it('keeps a lining with the compound label separate from the exterior percentages', () => {
    const result = parser.parseFromText('Composición: Exterior: 100% lino. Forro: 80% rayón viscosa 20% poliéster');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 100,
      semiSyntheticPercentage: 0, syntheticPercentage: 0, hasSyntheticLining: true });
    expect(result.fibers.filter(f => f.isLining)).toEqual([
      { fiberName: 'viscosa', category: 'SEMISYNTHETIC', percentage: 80, isLining: true },
      { fiberName: 'poliéster', category: 'SYNTHETIC', percentage: 20, isLining: true },
    ]);
  });
});
