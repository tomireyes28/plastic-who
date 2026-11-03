import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

describe('Composition evidence and sections (H04)', () => {
  const parser = new CompositionParserService(new TrafficLightService());

  it.each([
    'Composición: 50% algodón, poliéster 50%',
    'Composición: ALGODON 50%, 50% POLIESTER',
    'Composición: 50% algodón 50% poliéster',
    'Composición: ALGODON 50% POLIESTER 50%',
    'Composición: 50% algodón\n50% poliéster',
    '50% algodón\n50% poliéster',
    'Composición:\n\n50% algodón\n\n50% poliéster',
    '<p>Composici&oacute;n:</p><p>50% algod&oacute;n</p><p>50% poli&eacute;ster</p>',
  ])('retains each percentage once: %s', (text) => {
    const result = parser.parseFromText(text);
    expect(result.naturalPercentage).toBe(50);
    expect(result.syntheticPercentage).toBe(50);
    expect(result.fibers).toHaveLength(2);
    expect(result.trafficLight).toBe('RED');
  });

  it.each(['Viso', 'Forro', 'Forrería', 'Interior', 'Lining', 'FORRO-LINING'])
    ('retains a multiline %s without adding it to the exterior', (label) => {
      const result = parser.parseFromText(`Composición: 100% algodón\n${label}: 100% poliéster`);
      expect(result.naturalPercentage).toBe(100);
      expect(result.syntheticPercentage).toBe(0);
      expect(result.fibers).toHaveLength(2);
      expect(result.hasSyntheticLining).toBe(true);
      expect(result.trafficLight).toBe('YELLOW');
      expect(result.rawComposition).toContain(label);
    });

  it('supports multiline sections without a composition heading', () => {
    const result = parser.parseFromText('Exterior: 100% lino\nViso: 100% poliéster');
    expect(result.trafficLight).toBe('YELLOW');
    expect(result.hasSyntheticLining).toBe(true);
  });

  it.each(['Cuello', 'RIBB', 'Puños', 'Género combinación', 'Encaje'])
    ('does not substitute %s for an absent exterior', (label) => {
      const result = parser.parseFromText(`Composición: ${label}: 100% algodón`);
      expect(result.trafficLight).toBe('UNKNOWN');
      expect(result.fibers.filter(f => !f.isLining)).toEqual([]);
      expect(result.rawComposition).toContain(label);
    });

  it('keeps a lining warning even when there is no exterior', () => {
    const result = parser.parseFromText('Composición: Forro: 100% poliéster');
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.hasSyntheticLining).toBe(true);
    expect(result.fibers).toEqual([
      { fiberName: 'poliéster', category: 'SYNTHETIC', percentage: 100, isLining: true },
    ]);
  });

  it.each([
    'Composición: 50% algodón',
    'Composición: 98% algodón',
    'Composición: 5% algodón, 95% fibra desconocida',
    'Composición: 95% algodón, 5% fibra desconocida',
    'Composición: 100% algodón, poliéster',
    'Composición: 100% algodón, fibra desconocida',
    'Composición: 100% fibra desconocida',
    'Composición: algodón y poliéster',
    'Composición: 100% algodón\npoliéster',
  ])('does not assign a definitive color to incomplete evidence: %s', (text) => {
    const result = parser.parseFromText(text);
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.rawComposition).not.toBe('No indica');
  });

  it('does not hide an unrecognized portion by scaling the known one to 100%', () => {
    const result = parser.parseFromText('Composición: 5% algodón, 95% fibra desconocida');
    expect(result.naturalPercentage).toBe(5);
    expect(result.fibers[0].percentage).toBe(5);
  });

  it.each([
    'Composición: -100% algodón',
    'Composición: 110% algodón',
    'Composición: 1000% algodón',
    'Composición: 60% algodón, 60% poliéster',
    'Composición: 100% algodón, 5% fibra desconocida',
    'Composición: Tela base: 100% algodón. Exterior: 100% poliéster',
  ])('rejects contradictory or invalid amounts without normalizing them into certainty: %s', (text) => {
    const result = parser.parseFromText(text);
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.fibers.filter(f => !f.isLining)).toEqual([]);
    expect(result.naturalPercentage).toBe(0);
  });

  it('accepts a spaced hyphen separator without treating it as a negative sign', () => {
    expect(parser.parseFromText('Composición: 98% algodón - 2% elastano').trafficLight).toBe('GREEN');
  });

  it('does not interpret the following fiber as belonging to the previous percentage', () => {
    const result = parser.parseFromText('Composición: ALGODON 96% ELASTANO 4%');
    expect(result.naturalPercentage).toBe(96);
    expect(result.syntheticPercentage).toBe(4);
    expect(result.trafficLight).toBe('GREEN');
  });

  it('accepts bilingual aliases as one fiber in each section', () => {
    const result = parser.parseFromText('Composición: 100% algodón-cotton. FORRO-LINING: 100% algodón-cotton');
    expect(result.fibers).toHaveLength(2);
    expect(result.naturalPercentage).toBe(100);
    expect(result.trafficLight).toBe('GREEN');
  });

  it('keeps a synthetic lining warning while its other fibers are unknown', () => {
    const result = parser.parseFromText('Composición: Exterior: 100% algodón. Forro: 50% poliéster, 50% fibra desconocida');
    expect(result.trafficLight).toBe('UNKNOWN');
    expect(result.hasSyntheticLining).toBe(true);
  });

  it('does not award green when a declared lining could not be parsed', () => {
    const result = parser.parseFromText('Composición: 100% algodón. Forro: fibra desconocida');
    expect(result.trafficLight).toBe('UNKNOWN');
  });

  it('retains decimal percentages in mixed formats', () => {
    const result = parser.parseFromText('Composición: 33,3% algodón, lino 33,3%, 33,4% poliéster');
    expect(result.naturalPercentage).toBe(66.6);
    expect(result.syntheticPercentage).toBe(33.4);
  });

  it('does not inflate category totals when rounding valid decimal fibers', () => {
    const result = parser.parseFromText('Composición: 33,35% algodón, 33,35% viscosa, 33,3% poliéster');
    expect(result.fibers.reduce((sum, f) => sum + f.percentage, 0)).toBe(100);
    expect(result.naturalPercentage + result.semiSyntheticPercentage + result.syntheticPercentage).toBeLessThanOrEqual(100);
  });

  it('does not collect care percentages after the composition', () => {
    const result = parser.parseFromText('Composición: 100% algodón\nCuidados: lavado 50% delicado');
    expect(result.rawComposition).toBe('100% algodón');
    expect(result.trafficLight).toBe('GREEN');
  });

  it('does not extract composition from scripts or styles', () => {
    expect(parser.parseFromText('<script>"100% algodón"</script><style>/* 100% lino */</style>').trafficLight).toBe('UNKNOWN');
  });

  it.each(['Forro: Composición: 100% poliéster', 'Composición: Forro: composición: 100% poliéster'])
    ('keeps the scope of a nested heading: %s', (text) => {
      const result = parser.parseFromText(text);
      expect(result.trafficLight).toBe('UNKNOWN');
      expect(result.hasSyntheticLining).toBe(true);
      expect(result.fibers.every(f => f.isLining)).toBe(true);
    });

  it('does not treat an empty lining section as absent', () => {
    expect(parser.parseFromText('Composición: 100% algodón. Forro:').trafficLight).toBe('UNKNOWN');
  });

  it('accepts a small rounding shortfall but does not normalize an excess', () => {
    expect(parser.parseFromText('Composición: 33,3% algodón, 33,3% lino, 33,3% poliéster').trafficLight).toBe('RED');
    expect(parser.parseFromText('Composición: 50,05% algodón, 50,05% poliéster').trafficLight).toBe('UNKNOWN');
  });
});
