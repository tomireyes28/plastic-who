import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

// Representative paragraphs from the 86 captured, manually reviewed declarations.
// Public source URLs document provenance; tests never fetch them.
const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/h06-funky-declarations.json'), 'utf8'));

describe('H06 explicit Funky Monkeys declarations in product prose', () => {
  const parser = new CompositionParserService(new TrafficLightService());

  it.each(fixtures)('reproduces the reviewed analysis of $name', ({ description, expected }) => {
    expect(parser.parseFromText(description)).toMatchObject(expected);
  });

  it.each([
    'Body confeccionado en algodón jersey de la mejor calidad, muy suave y extra cómodo.',
    'Body confeccionado 50% en algodón jersey de la mejor calidad, muy suave y extra cómodo.',
    'Body confeccionado 101% en algodón jersey de la mejor calidad, muy suave y extra cómodo.',
    'Body confeccionado -100% en algodón jersey de la mejor calidad, muy suave y extra cómodo.',
    'Body confeccionado 100% en algodón jersey, poliéster.',
    'Body confeccionado 100% en algodón jersey, otras fibras.',
    'Body confeccionado 100% en algodón jersey, material misterioso.',
    'Body confeccionado 100% en algodón jersey, muy suave y extra cómodo con poliéster.',
    'Body confeccionado 100% en algodón jersey, muy suave y extra cómodo con otras fibras.',
    'Body confeccionado 100% en algodón jersey, muy suave y extra cómodo con material misterioso.',
    'Body confeccionado 100% en algodón jersey, muy suave y extra cómodo.\nForro: poliéster',
    'Body confeccionado 100% en algodón jersey, muy suave y extra cómodo.\nMaterial: Jersey 100% poliéster',
    'Forro: 100% en algodón jersey, muy suave y extra cómodo.',
    'Body confeccionado 100% en algodón jersey, de la mejor calidad, 5% elastano.',
    'Body confeccionado 100% en algodón jersey, de la mejor calidad, material misterioso.',
    'Body confeccionado 100% en algodón jersey, super suave y extra confortable con material misterioso.',
    'Descubre nuestra remera mangas cortas con lino, confeccionada en 100% algodón.',
    'Descubre nuestra remera mangas cortas con fibras desconocidas, confeccionada en 100% algodón.',
  ])('keeps incomplete or contradictory evidence unknown: %s', text => {
    expect(parser.parseFromText(text).trafficLight).toBe('UNKNOWN');
  });

  it('keeps the synthetic lining separate and downgrades the exterior green', () => {
    const result = parser.parseFromText('Body confeccionado 100% en algodón jersey de la mejor calidad, muy suave y extra cómodo.\nForro: 100% poliéster');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 100, hasSyntheticLining: true });
    expect(result.fibers).toHaveLength(2);
  });

  it('preserves the source wording instead of synthesizing a composition', () => {
    const text = 'Bermuda confeccionada en rústico 100% viscosa , super livianito, fresco y extra cómodo.';
    expect(parser.parseFromText(text).rawComposition).toBe(text);
  });

  it('keeps a nested Material heading inside the lining', () => {
    const result = parser.parseFromText('Exterior: 100% algodón\nForro: Material: 100% poliéster');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 100, hasSyntheticLining: true });
    expect(result.fibers.find(f => f.fiberName === 'poliéster')?.isLining).toBe(true);
  });

  it('does not count a repeated Material declaration twice', () => {
    const result = parser.parseFromText('Confeccionada en jersey 100% algodón.\nMaterial: Jersey 100% algodón');
    expect(result).toMatchObject({ trafficLight: 'GREEN', naturalPercentage: 100 });
    expect(result.fibers).toHaveLength(1);
  });
});
