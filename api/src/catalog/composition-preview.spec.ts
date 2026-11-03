import { CompositionParserService } from '../composition/composition-parser.service';
import { TrafficLightService } from '../composition/traffic-light.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildCompositionPreview, PreviewProduct, readCompositionSnapshot, renderCompositionPreview } from './composition-preview';

describe('Composition repair preview (H06)', () => {
  const parser = new CompositionParserService(new TrafficLightService());
  const product = (changes: Partial<PreviewProduct> = {}): PreviewProduct => ({
    id: 'fixture', name: 'Fixture', productUrl: 'https://example.invalid/fixture', isActive: true,
    brand: { slug: 'fixture', name: 'Fixture', isActive: true }, updatedAt: new Date('2026-11-03T00:00:00Z'),
    description: 'Composición: 100% algodón', rawComposition: '100% algodón',
    naturalPercentage: 100, semiSyntheticPercentage: 0, syntheticPercentage: 0,
    trafficLight: 'GREEN', hasSyntheticLining: false,
    fibers: [{ fiberName: 'algodón', category: 'NATURAL', percentage: 100, isLining: false }],
    ...changes,
  });

  it('reads inside a repeatable-read transaction with writes disabled before SELECT', async () => {
    const events: string[] = [];
    const tx = {
      $executeRaw: jest.fn(async (query: TemplateStringsArray) => {
        expect(query.join('')).toBe('SET TRANSACTION READ ONLY'); events.push('read-only');
      }),
      product: { findMany: jest.fn(async () => { events.push('select'); return [product()]; }) },
    };
    const transaction = jest.fn(async (callback) => callback(tx));
    const snapshot = await readCompositionSnapshot({ $transaction: transaction } as unknown as PrismaService);
    expect(snapshot).toHaveLength(1);
    expect(events).toEqual(['read-only', 'select']);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'RepeatableRead' }));
  });

  it('does not query if the read-only transaction setup fails', async () => {
    const findMany = jest.fn();
    const tx = { $executeRaw: jest.fn().mockRejectedValue(new Error('fixture')), product: { findMany } };
    const prisma = { $transaction: async callback => callback(tx) };
    await expect(readCompositionSnapshot(prisma as unknown as PrismaService)).rejects.toThrow('fixture');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('leaves already-correct compositions unchanged', () => {
    const preview = buildCompositionPreview([product()], parser, 'test-code');
    expect(preview.summary.changed).toBe(0);
    expect(preview.rows[0].action).toBe('UNCHANGED');
  });

  it('reprocesses the original description rather than the truncated composition', () => {
    const preview = buildCompositionPreview([product({ description: 'Composición: 100% algodón\nViso: 100% poliéster' })], parser, 'test');
    expect(preview.rows[0].after).toMatchObject({ trafficLight: 'YELLOW', hasSyntheticLining: true });
    expect(preview.summary.changed).toBe(1);
  });

  it('preserves old values and fixes the proposed invalid total without mutating the input', () => {
    const input = product({ syntheticPercentage: 100, fibers: [
      { fiberName: 'algodón', category: 'NATURAL', percentage: 100, isLining: false },
      { fiberName: 'poliéster', category: 'SYNTHETIC', percentage: 100, isLining: false },
    ] });
    const before = JSON.stringify(input);
    const preview = buildCompositionPreview([input], parser, 'test');
    expect(preview.summary).toMatchObject({ invalidTotalsBefore: 1, invalidTotalsProposed: 0 });
    expect(preview.rows[0].before.syntheticPercentage).toBe(100);
    expect(preview.rows[0].after.syntheticPercentage).toBe(0);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ['one-place-world', 'Línea de Bambú One Place World.\nComposición: 96% bambú y 4% elastano.\nTela hipoalergénica.'],
    ['reir-enloquecer', 'Blusa Ipanema\nComposición: 100% algodón.'],
    ['reir-enloquecer', 'Microtul\nComposición: 100% poliéster (microtul).'],
    ['funky-monkeys', 'Rompevientos\nExterior: 100% poliéster. Forrería: 100% algodón.'],
    ['funky-monkeys', 'Algodón 100%\nComposición: 100% algodón.'],
  ])('requires source verification for legacy inference in %s', (slug, description) => {
    const preview = buildCompositionPreview([product({ brand: { slug, name: slug, isActive: true }, description })], parser, 'test');
    expect(preview.rows[0]).toMatchObject({ action: 'REVIEW_SOURCE', sourceReviewRequired: true });
    expect(preview.rows[0].after).toMatchObject({ trafficLight: 'UNKNOWN', fibers: [] });
    expect(preview.rows[0].description).toBe(description);
  });

  it('does not assume that every product of a formerly affected brand is inferred', () => {
    const preview = buildCompositionPreview([product({ brand: { slug: 'funky-monkeys', name: 'Funky', isActive: true } })], parser, 'test');
    expect(preview.rows[0].sourceReviewRequired).toBe(false);
    expect(preview.rows[0].after.trafficLight).toBe('GREEN');
  });

  it('does not silently substitute the old rawComposition if the original input is missing', () => {
    const preview = buildCompositionPreview([product({ description: null })], parser, 'test');
    expect(preview.rows[0].after.trafficLight).toBe('UNKNOWN');
    expect(preview.rows[0].reasons).toContain('MISSING_ORIGINAL_DESCRIPTION');
  });

  it('distinguishes active impact and generates a review document with no write instructions', () => {
    const preview = buildCompositionPreview([product({ isActive: false, description: 'Composición: 50% algodón' })], parser, 'test');
    expect(preview.summary).toMatchObject({ changed: 1, changedVisible: 0 });
    const markdown = renderCompositionPreview(preview);
    expect(markdown).toContain('solo lectura');
    expect(markdown).toContain('GREEN → UNKNOWN');
    expect(preview.rows[0].sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes the stale-data fingerprint when the original description changes', () => {
    const before = buildCompositionPreview([product()], parser, 'test');
    const after = buildCompositionPreview([product({ description: 'Composición: 100% lino' })], parser, 'test');
    expect(before.rows[0].sourceFingerprint).not.toBe(after.rows[0].sourceFingerprint);
  });
});
