import { CompositionParserService } from './composition-parser.service';
import { TrafficLightService } from './traffic-light.service';

describe('CompositionParserService', () => {
  let parser: CompositionParserService;
  let trafficLight: TrafficLightService;

  beforeEach(() => {
    trafficLight = new TrafficLightService();
    parser = new CompositionParserService(trafficLight);
  });

  it('debe parsear la ficha real de Wanama (100% ramié) como VERDE', () => {
    const wanamaDescription = `La Camisa New Margarite de Wanama tiene un aire romántico.\\n\\n• Camisa de ramié.\\n• Puntilla de algodón.\\n• Composición: 100% ramié.\\n\\nColores: Off white y azul`;

    const result = parser.parseFromText(wanamaDescription);

    expect(result.rawComposition).toBe('100% ramié.');
    expect(result.fibers).toEqual([
      {
        fiberName: 'ramié',
        category: 'NATURAL',
        percentage: 100,
        isLining: false,
      },
    ]);
    expect(result.naturalPercentage).toBe(100);
    expect(result.trafficLight).toBe('GREEN');
    expect(result.hasSyntheticLining).toBe(false);
  });

  it('debe normalizar Spandex como elastano y clasificar un Jean 98% Algodón - 2% Spandex como VERDE (>=95%)', () => {
    const jeanDescription =
      'Jean de calce fit, ajustado al cuerpo. Composición: 98% Algodón - 2% Spandex.';

    const result = parser.parseFromText(jeanDescription);

    expect(result.naturalPercentage).toBe(98);
    expect(result.syntheticPercentage).toBe(2);
    expect(result.trafficLight).toBe('GREEN');
    expect(result.fibers).toEqual([
      {
        fiberName: 'algodón',
        category: 'NATURAL',
        percentage: 98,
        isLining: false,
      },
      {
        fiberName: 'elastano',
        category: 'SYNTHETIC',
        percentage: 2,
        isLining: false,
      },
    ]);
  });

  it('debe clasificar una mezcla 55% viscosa / 45% poliéster como AMARILLO por tener fibra semisintética', () => {
    const dressDescription = 'Vestido estampado. Composición: 55% viscosa, 45% poliéster';

    const result = parser.parseFromText(dressDescription);

    expect(result.naturalPercentage).toBe(0);
    expect(result.semiSyntheticPercentage).toBe(55);
    expect(result.syntheticPercentage).toBe(45);
    expect(result.trafficLight).toBe('YELLOW');
  });

  it('debe clasificar un sweater 70% lana / 30% acrílico como AMARILLO', () => {
    const sweaterDescription = 'Composición: 70% lana 30% acrílico';

    const result = parser.parseFromText(sweaterDescription);

    expect(result.naturalPercentage).toBe(70);
    expect(result.syntheticPercentage).toBe(30);
    expect(result.trafficLight).toBe('YELLOW');
  });

  it('debe clasificar una blusa 60% algodón / 40% poliéster como ROJO (<70% natural y sin semisintéticos)', () => {
    const blouseDescription = 'Composición: 60% algodón, 40% poliéster';

    const result = parser.parseFromText(blouseDescription);

    expect(result.naturalPercentage).toBe(60);
    expect(result.syntheticPercentage).toBe(40);
    expect(result.trafficLight).toBe('RED');
  });

  it('debe separar Exterior de Forrería y marcar hasSyntheticLining = true sin sumar 200%', () => {
    const jacketDescription =
      'Blazer sastrero. Composición: Exterior: 100% Lino. Forrería: 100% Poliéster.';

    const result = parser.parseFromText(jacketDescription);

    expect(result.naturalPercentage).toBe(100);
    expect(result.syntheticPercentage).toBe(0);
    expect(result.trafficLight).toBe('GREEN');
    expect(result.hasSyntheticLining).toBe(true);
    expect(result.fibers).toEqual([
      {
        fiberName: 'lino',
        category: 'NATURAL',
        percentage: 100,
        isLining: false,
      },
      {
        fiberName: 'poliéster',
        category: 'SYNTHETIC',
        percentage: 100,
        isLining: true,
      },
    ]);
  });
});
