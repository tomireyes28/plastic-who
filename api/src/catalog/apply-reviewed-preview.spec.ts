import { createHash } from 'node:crypto';
import { applyReviewedPlan, ReviewedPlan, validateReviewedState, verifyPlanDigest } from './apply-reviewed-preview';
import { buildCompositionPreview, PreviewProduct } from './composition-preview';
import { CompositionParserService } from '../composition/composition-parser.service';
import { TrafficLightService } from '../composition/traffic-light.service';
import { PrismaService } from '../prisma/prisma.service';

const parser = new CompositionParserService(new TrafficLightService());
function fixture() {
  const product = { id: 'fixture', name: 'Fixture', productUrl: 'https://example.invalid', isActive: true,
    updatedAt: new Date('2026-01-01'), description: 'Composición: 100% algodón', rawComposition: '100% poliéster',
    naturalPercentage: 0, semiSyntheticPercentage: 0, syntheticPercentage: 100, trafficLight: 'RED', hasSyntheticLining: false,
    fibers: [{ fiberName: 'poliéster', category: 'SYNTHETIC', percentage: 100, isLining: false }],
    brand: { slug: 'fixture', name: 'Fixture', isActive: true } } as PreviewProduct;
  const row = buildCompositionPreview([product], parser, 'fixture').rows[0];
  const unsigned = { mode: 'CONSERVATIVE_REVIEW_ONLY_NO_APPLY', databaseFingerprint: 'fixture', analyzerFingerprint: 'fixture', adapterFingerprint: 'fixture',
    rows: [{ ...row, proposedDescription: product.description, approvedToApply: false }] };
  const plan = { ...unsigned, reviewFingerprint: createHash('sha256').update(JSON.stringify(unsigned)).digest('hex') } as ReviewedPlan;
  const tx = { $executeRaw: jest.fn().mockResolvedValueOnce(0).mockResolvedValue(1),
    productFiber: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }), createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    brand: { findMany: jest.fn().mockResolvedValue([product.brand]) }, product: {
    findMany: jest.fn().mockResolvedValueOnce([product]).mockResolvedValue([{ ...product, ...row.after }]), update: jest.fn().mockResolvedValue({}),
  } };
  const prisma = { $transaction: jest.fn(async action => action(tx)) } as unknown as PrismaService;
  return { product, plan, tx, prisma };
}
describe('Explicit, guarded H06 application (simulated DB only)', () => {
  it('requires the exact reviewed digest and detects edits', () => {
    const { plan } = fixture();
    expect(() => verifyPlanDigest(plan, 'wrong')).toThrow();
    expect(() => verifyPlanDigest(plan, plan.reviewFingerprint)).not.toThrow();
    plan.rows[0].after.naturalPercentage = 99;
    expect(() => verifyPlanDigest(plan, plan.reviewFingerprint)).toThrow();
  });
  it('backs up before writing and modifies only composition and source description', async () => {
    const { plan, tx, prisma } = fixture();
    const backup = jest.fn(async () => { expect(tx.$executeRaw).toHaveBeenCalledTimes(1); expect(tx.productFiber.deleteMany).not.toHaveBeenCalled(); });
    expect(await applyReviewedPlan(prisma, plan, backup)).toEqual({ changed: 1, validated: 1 });
    expect(tx.$executeRaw).toHaveBeenCalled(); expect(backup).toHaveBeenCalled();
    const data = JSON.parse(tx.$executeRaw.mock.calls[1][1])[0];
    expect(data.trafficLight).toBe('GREEN');
    for (const field of ['name', 'price', 'inStock', 'isActive', 'lastSeenAt', 'brandId']) expect(data).not.toHaveProperty(field);
  });
  it('does not write if backup creation fails', async () => {
    const { plan, tx, prisma } = fixture();
    await expect(applyReviewedPlan(prisma, plan, async () => { throw new Error('disk full'); })).rejects.toThrow('disk full');
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
  it('does not back up or write if an input changed', async () => {
    const { plan, tx, prisma } = fixture(); plan.rows[0].sourceFingerprint = 'stale'; const backup = jest.fn();
    await expect(applyReviewedPlan(prisma, plan, backup)).rejects.toThrow('Inputs changed');
    expect(tx.product.update).not.toHaveBeenCalled(); expect(backup).not.toHaveBeenCalled();
  });
  it('rejects invalid quantities before opening a write transaction', async () => {
    const { plan, prisma } = fixture(); plan.rows[0].after.naturalPercentage = 200;
    await expect(applyReviewedPlan(prisma, plan, jest.fn())).rejects.toThrow('Invalid quantity');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('throws inside the transaction if persisted state differs', async () => {
    const { plan, tx, prisma, product } = fixture();
    tx.product.findMany.mockReset().mockResolvedValue([product]);
    await expect(applyReviewedPlan(prisma, plan, jest.fn())).rejects.toThrow('Post-write validation failed');
  });
  it('rejects excessive main or lining totals', () => {
    const state = parser.parseFromText('100% algodón');
    state.fibers.push({ fiberName: 'lino', category: 'NATURAL', percentage: 50, isLining: false });
    expect(() => validateReviewedState(state)).toThrow('Excess total');
  });
  it('rejects aggregates that do not match the declared fibers', () => {
    const state = parser.parseFromText('100% algodón'); state.naturalPercentage = 50;
    expect(() => validateReviewedState(state)).toThrow('Aggregates do not match');
  });
  it('aborts before fiber replacement if the bulk update count differs', async () => {
    const { plan, tx, prisma } = fixture();
    tx.$executeRaw.mockReset().mockResolvedValue(0);
    await expect(applyReviewedPlan(prisma, plan, jest.fn())).rejects.toThrow('Unexpected update count');
    expect(tx.productFiber.deleteMany).not.toHaveBeenCalled();
  });
});
