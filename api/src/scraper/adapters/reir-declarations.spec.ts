import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CompositionParserService } from '../../composition/composition-parser.service';
import { TrafficLightService } from '../../composition/traffic-light.service';
import { ReirEnloquecerScraperAdapter } from './reir-enloquecer-scraper.adapter';

// Public product-body excerpts, not whole pages or database snapshots. No network requests.
const fixtures = JSON.parse(readFileSync(join(__dirname, '../../composition/fixtures/h06-reir-declarations.json'), 'utf8'));

describe('H06 Reír Enloquecer source declarations', () => {
  const adapter = new ReirEnloquecerScraperAdapter();
  const parser = new CompositionParserService(new TrafficLightService());
  afterEach(() => jest.restoreAllMocks());

  async function read(body: string, heading = '<h1 class="js-product-name">Prenda</h1>') {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(heading + body));
    return adapter.fetchProductDetail('https://www.reirenloquecer.com/productos/prenda/');
  }

  it.each(fixtures)('reproduces the reviewed declaration of $name from the product HTML', async fixture => {
    const product = await read(`<div class="js-product-description user-content">${fixture.descriptionHtml}</div>`,
      `<h1 class="js-product-name product-name">${fixture.name}</h1>`);
    expect(product?.name).toBe(fixture.name);
    expect(product?.description).toBe(fixture.description);
    expect(parser.parseFromText(product!.description)).toMatchObject(fixture.expected);
  });

  it('keeps the full nested product body and ignores a longer footer', async () => {
    const product = await read(`<div class="footer user-content">${'Composición: 100% poliéster '.repeat(30)}</div>
      <div class="js-product-description"><p>Exterior: 100% algodón</p><div><p>Forro: 100% poliéster</p></div><p>Cuidados: lavar a mano</p></div>`);
    expect(product?.description).toBe('Exterior: 100% algodón\nForro: 100% poliéster\nCuidados: lavar a mano');
    expect(parser.parseFromText(product!.description)).toMatchObject({ trafficLight: 'YELLOW', hasSyntheticLining: true });
  });

  it.each([
    '<div class="footer user-content">Composición: 100% algodón</div>',
    '<div class="not-js-product-description">Composición: 100% algodón</div>',
    '<div class="js-product-description"><p>Composición: 100% algodón</p>',
    '<!-- <div class="js-product-description">Composición: 100% algodón</div> -->',
  ])('does not substitute unrelated or unbounded text: %s', async body => {
    const product = await read(body);
    expect(product?.description).toBe('');
    expect(parser.parseFromText(product!.description).trafficLight).toBe('UNKNOWN');
  });

  it('ignores script/style content while preserving the real declaration', async () => {
    const product = await read('<div class="js-product-description"><script>const x="</div>Composición: 100% poliéster";</script><style>div { color: red }</style><p>Composición: 100% algodón</p></div>');
    expect(product?.description).toBe('Composición: 100% algodón');
  });

  it('prefers existing title metadata over the heading fallback', async () => {
    const product = await read('', '<meta property="og:title" content="Camisa | Reir"><h1 class="js-product-name">Otro nombre</h1>');
    expect(product?.name).toBe('Camisa');
  });

  it('requires product identity rather than an unrelated heading or page title', async () => {
    expect(await read('', '<title>Una tienda</title><h1>Otra prenda</h1>')).toBeNull();
  });

  it.each([
    'Nuestros clásicos más elegidos, en denim!',
    'Nuestros clásicos más elegidos, en denim 50% algodón!',
    'Nuestros clásicos más elegidos, en gabardina 101% algodón!',
    'Nuestros clásicos más elegidos, en gabardina -100% algodón!',
    'Nuestros clásicos más elegidos, en denim 100% algodón, poliéster!',
    'Nuestros clásicos más elegidos, en denim 100% algodón, material desconocido!',
    'Confeccionada en poplin de algodón 100%, con una estampa llena de color y vida y poliéster!',
    'Confeccionada en poplin de algodón 100%, con una estampa llena de color y vida y material desconocido!',
    'Nuestros clásicos más elegidos, en denim 100% algodón!\nConfeccionado en denim 100% poliéster.',
    'Nuestros clásicos más elegidos, en denim 100% algodón!\nConfeccionado en denim 50% algodón.',
    'Nuestros clásicos más elegidos, en denim 100% algodón!\nConfeccionado en 100% poliéster.',
    'Nuestros clásicos más elegidos, en denim 100% algodón!\nConfeccionado en material misterioso 100%.',
    'Nuestros clásicos más elegidos, en denim 100% algodón!\nForro: algodón',
    'Forro: Nuestros clásicos más elegidos, en denim 100% algodón!',
    'Confeccionada en gabardina 100% algodón, ligera y fresca con material desconocido.',
  ])('keeps unsupported quantities, materials or conflicts unknown: %s', text => {
    expect(parser.parseFromText(text).trafficLight).toBe('UNKNOWN');
  });

  it('does not lose a synthetic lining after the collection declaration', () => {
    const result = parser.parseFromText('Nuestros clásicos más elegidos, en denim 100% algodón!\nForro: 100% poliéster');
    expect(result).toMatchObject({ trafficLight: 'YELLOW', naturalPercentage: 100, hasSyntheticLining: true });
  });

  it('preserves the reviewed Funky Morley result when retaining its repeated declaration', () => {
    const text = 'CONJUNTO MORLEY 100% ALGODÓN\nConjunto confeccionado en morley 100% algodón, super suave y combinable con todo.';
    const result = parser.parseFromText(text);
    expect(result).toMatchObject({ trafficLight: 'GREEN', naturalPercentage: 100 });
    expect(result.fibers).toHaveLength(1);
  });
});
