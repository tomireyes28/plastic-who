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
    ['triacetato', 'acetato'], ['lana merino', 'lana'], ['fibra de bambú', 'bambú'],
  ])('preserves alias %s', (alias, canonicalName) => {
    expect(resolveFiber(alias)?.canonicalName).toBe(canonicalName);
  });

  it('does not match fragments inside an unknown word', () => {
    expect(resolveFiber('microalgodon')).toBeNull();
  });
});
