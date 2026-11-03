import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

const fixtures: { name: string; sourceUrl: string; capturedAt: string; text: string }[] = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/cotton-construction-statements.json'), 'utf8'),
);

describe('Explicit cotton construction statements (H06 integration)', () => {
  const parser = new CompositionParserService(new TrafficLightService());
  const cotton = { fiberName: 'algodón', category: 'NATURAL', percentage: 100, isLining: false };

  // 17 source paragraphs cover the 39 reviewed product descriptions without live requests.
  it.each(fixtures)('recognizes the quantified statement from $name', ({ text }) => {
    const result = parser.parseFromText(text);
    expect(result).toMatchObject({ trafficLight: 'GREEN', naturalPercentage: 100,
      semiSyntheticPercentage: 0, syntheticPercentage: 0 });
    expect(result.fibers).toEqual([cotton]);
    expect(result.rawComposition).toMatch(/jersey|frisa/i);
  });

  it.each([
    'Composición: 100% en jersey de algodón',
    'Composición: 100% en frisa de algodón',
    'Confeccionado en 100% frisa de algodón.',
    'Confeccionada en jersey 100% de algodón.',
    'Composición: 100 % EN JERSEY DE ALGODO\u0301N',
    '<p>Confeccionado 100% en jersey de algod&oacute;n, muy suave y extra cómodo.</p>',
  ])('recognizes explicit fiber and quantity: %s', text => {
    expect(parser.parseFromText(text).fibers).toEqual([cotton]);
    expect(parser.parseFromText(text).trafficLight).toBe('GREEN');
  });

  it('preserves the captured split-word typo in the source text', () => {
    const text = 'Confeccionado 100% en Frisa de A lgodón, especialmente diseñado para niños.';
    const result = parser.parseFromText(text);
    expect(result.trafficLight).toBe('GREEN');
    expect(result.rawComposition).toBe(text);
  });

  it.each([
    'Prenda de jersey de algodón, suave y cómoda.',
    'Confeccionado 100% en jersey.',
    'Confeccionado 100% en frisa.',
    '100% comodidad en jersey de algodón.',
    'Composición: 100% en jersey de fibra desconocida',
    'Composición: 100% en frisa de algodón, fibra desconocida',
    'Composición: 100% en jersey de algodón y otras fibras',
    'Con fibra desconocida, confeccionado 100% en jersey de algodón.',
    'Con poliéster, confeccionado 100% en jersey de algodón.',
    'Con cuero, confeccionado 100% en jersey de algodón.',
  ])('keeps unsupported or incomplete evidence uncertain: %s', text => {
    expect(parser.parseFromText(text).trafficLight).toBe('UNKNOWN');
  });

  it('retains a partial quantity without inflating it to 100%', () => {
    const result = parser.parseFromText('Confeccionado 80% en jersey de algodón.');
    expect(result).toMatchObject({ trafficLight: 'UNKNOWN', naturalPercentage: 80 });
  });

  it('keeps another quantified fiber in the same commercial sentence', () => {
    const result = parser.parseFromText('Confeccionado 80% en jersey de algodón, 20% poliéster, muy suave y extra cómodo.');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 80, syntheticPercentage: 20 });
    expect(result.fibers).toHaveLength(2);
  });

  it('keeps unquantified known fibers uncertain even in a commercial tail', () => {
    expect(parser.parseFromText('Confeccionado 100% en jersey de algodón, muy suave y extra cómodo, con poliéster.').trafficLight).toBe('UNKNOWN');
  });

  it.each([
    'Composición: 100% en frisa de algodón, 5% elastano',
    'Composición: -100% en jersey de algodón',
    'Composición: 110% en jersey de algodón',
  ])('rejects invalid quantities: %s', text => {
    const result = parser.parseFromText(text);
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.fibers).toEqual([]);
  });

  it('does not infer cotton from jersey when a different fiber is declared', () => {
    const result = parser.parseFromText('Composición: 100% en jersey de poliéster');
    expect(result).toMatchObject({ trafficLight: 'RED', naturalPercentage: 0, syntheticPercentage: 100 });
  });

  it('keeps synthetic lining separate and downgrades the exterior green', () => {
    const result = parser.parseFromText('Exterior: 100% en jersey de algodón\nForro: 100% poliéster');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 100,
      syntheticPercentage: 0, hasSyntheticLining: true });
    expect(result.fibers.filter(f => !f.isLining)).toEqual([cotton]);
    expect(result.fibers.filter(f => f.isLining)).toEqual([
      { fiberName: 'poliéster', category: 'SYNTHETIC', percentage: 100, isLining: true },
    ]);
  });

  it('does not let a lining construction statement replace an absent exterior', () => {
    const result = parser.parseFromText('Forro: 100% en jersey de algodón');
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.fibers).toEqual([{ ...cotton, isLining: true }]);
  });

  it('still rejects contradictory declarations for the same part', () => {
    const result = parser.parseFromText('Composición: 100% en jersey de algodón\nExterior: 100% poliéster');
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.fibers).toEqual([]);
  });

  it('does not interpret care text past the composition boundary', () => {
    const result = parser.parseFromText('Composición: 100% en jersey de algodón\nCuidados: usar 5% de suavizante');
    expect(result.trafficLight).toBe('GREEN');
    expect(result.fibers).toEqual([cotton]);
    expect(result.rawComposition).not.toContain('suavizante');
  });
});
