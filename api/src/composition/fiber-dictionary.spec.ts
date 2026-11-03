import { resolveFiber } from './fiber-dictionary';
import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

describe('Specific fiber aliases (H03)', () => {
  it.each(['viscosa de bambú', 'VISCOSA DE BAMBU', 'viscosa  de\n bambú', 'viscosa bambú'])
    ('recognizes %s as viscose instead of natural bamboo', (name) => {
      expect(resolveFiber(name)).toEqual({ canonicalName: 'viscosa', category: 'SEMISYNTHETIC' });
    });

  it.each(['Composición: 100% viscosa de bambú', 'Composición: VISCOSA DE BAMBU 100%'])
    ('classifies the full declaration: %s', (text) => {
      const parser = new CompositionParserService(new TrafficLightService());
      const result = parser.parseFromText(text);
      expect(result.naturalPercentage).toBe(0);
      expect(result.semiSyntheticPercentage).toBe(100);
      expect(result.trafficLight).toBe('YELLOW');
    });

  it.each([
    ['algodón pima', 'algodón'], ['poliéster reciclado', 'poliéster'],
    ['triacetato', 'acetato'], ['lana merino', 'lana'],
  ])('preserves alias %s', (alias, canonicalName) => {
    expect(resolveFiber(alias)?.canonicalName).toBe(canonicalName);
  });

  it('does not match fragments inside an unknown word', () => {
    expect(resolveFiber('microalgodon')).toBeNull();
  });

  it.each(['bambú', 'fibra de bambú', 'microfibra'])('does not assign a category to an ambiguous label: %s', name => {
    expect(resolveFiber(name)).toBeNull();
  });

  it.each([
    '96% bambú, 4% elastano', '100% microfibra',
    '100% algodón con bambú', '100% algodón con microfibra',
    'Exterior: 100% algodón. Forro: 100% microfibra',
  ])('preserves uncertainty and original wording: %s', text => {
    const parser = new CompositionParserService(new TrafficLightService());
    const result = parser.parseFromText(text);
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.rawComposition).toContain(text.startsWith('Exterior') ? 'microfibra' : text);
  });

  it.each(['100% viscosa bambú', '100% viscosa de bambú', '100% microfibra de poliéster'])('classifies an identified material: %s', text => {
    const parser = new CompositionParserService(new TrafficLightService());
    expect(parser.parseFromText(text).trafficLight).toBe(text.includes('viscosa') ? 'YELLOW' : 'RED');
  });
});
