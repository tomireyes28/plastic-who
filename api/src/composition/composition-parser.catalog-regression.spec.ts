import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

// Historical public product text, committed as fixtures so tests never query stores or DB.
const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/h04-catalog-regressions.json'), 'utf8'));

describe('H04 regressions found during catalog review', () => {
  const parser = new CompositionParserService(new TrafficLightService());

  it.each(fixtures)('preserves the supported composition of $name', ({ description, expected }) => {
    const result = parser.parseFromText(description);
    expect(result).toMatchObject(expected);
    expect(result.semiSyntheticPercentage).toBe(0);
    expect(result.fibers.filter(f => !f.isLining).reduce((sum, f) => sum + f.percentage, 0)).toBe(100);
    if (expected.hasSyntheticLining) {
      expect(result.fibers.filter(f => f.isLining)).toEqual([
        { fiberName: 'algodón', category: 'NATURAL', percentage: 50, isLining: true },
        { fiberName: 'poliéster', category: 'SYNTHETIC', percentage: 50, isLining: true },
      ]);
    }
  });

  it.each([
    '50% algodón-cotton 50% poliéster-polyester',
    'ALGODÓN-COTTON 50% POLIÉSTER-POLYESTER 50%',
    'algodón/cotton 50%, 50% poliéster/polyester',
    '50% cotton-algodón, polyester-poliéster 50%',
    '50% algodón / cotton / algodon, 50% poliéster / polyester',
    '50% algodón – cotton, 50% poliéster — polyester',
  ])('associates each percentage with the full alias group: %s', (text) => {
    const result = parser.parseFromText(`Composición: ${text}`);
    expect(result).toMatchObject({ trafficLight: 'RED', naturalPercentage: 50, syntheticPercentage: 50 });
    expect(result.fibers).toHaveLength(2);
  });

  it('keeps a synthetic lining warning when only the lining has bilingual blends', () => {
    const result = parser.parseFromText('Composición: Exterior: 100% lino. Forro: 50% algodón-cotton 50% poliéster-polyester');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 100, syntheticPercentage: 0, hasSyntheticLining: true });
  });

  it('does not merge two different fibers just because a slash separates them', () => {
    expect(parser.parseFromText('Composición: 100% algodón/poliéster').trafficLight).toBe('UNKNOWN');
  });

  it('does not collapse separate percentages on the same fiber', () => {
    const result = parser.parseFromText('Composición: 50% algodón, 50% cotton');
    expect(result).toMatchObject({ trafficLight: 'GREEN', naturalPercentage: 100 });
  });

  it('does not accept an excess merely because the aliases are equivalent', () => {
    const result = parser.parseFromText('Composición: 100% algodón-cotton 5% poliéster-polyester');
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.fibers).toEqual([]);
  });

  it('deduplicates equivalent declarations after intervening commercial prose', () => {
    const result = parser.parseFromText('Composición: 98% algodón 2% elastano\nCalce regular, con bordados. Composición: ALGODÓN 98%, ELASTANO 2%');
    expect(result).toMatchObject({ trafficLight: 'GREEN', naturalPercentage: 98, syntheticPercentage: 2 });
    expect(result.rawComposition).not.toContain('Calce regular');
    expect(result.fibers).toHaveLength(2);
  });

  it('skips prose percentages without assigning them to the technical block', () => {
    const result = parser.parseFromText('Composición: 100% algodón\nUna prenda de calce holgado, ideal para usar todo el año.\nAprovechá el 50% de descuento.');
    expect(result.trafficLight).toBe('GREEN');
    expect(result.rawComposition).toBe('100% algodón');
  });

  it('does not skip a declared lining after a descriptive paragraph', () => {
    const result = parser.parseFromText('Composición: 100% lino\nCalce regular, largo a la cintura.\nForro: 100% poliéster');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', hasSyntheticLining: true });
  });

  it('still rejects conflicting explicit compositions after prose', () => {
    const result = parser.parseFromText('Composición: 100% algodón\nCalce regular, de composición 100% poliéster');
    expect(result.trafficLight).toBe('UNKNOWN');
  });

  it('does not hide an unsupported numbered fabric section', () => {
    expect(parser.parseFromText('Composición: 100% algodón\nTejido 2: 100% poliéster').trafficLight).toBe('UNKNOWN');
  });

  it('does not turn a partial bilingual declaration into a complete one', () => {
    expect(parser.parseFromText('Composición: 50% algodón-cotton').trafficLight).toBe('UNKNOWN');
  });

  it('does not consume a later declaration past the care boundary', () => {
    const result = parser.parseFromText('Composición: 100% algodón\nCuidados: lavar a mano\nComposición: 100% poliéster');
    expect(result).toMatchObject({ trafficLight: 'GREEN', naturalPercentage: 100 });
    expect(result.rawComposition).not.toContain('poliéster');
  });
});
