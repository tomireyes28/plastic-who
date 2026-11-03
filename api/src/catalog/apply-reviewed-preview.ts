import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CompositionParserService, CompositionAnalysisResult } from '../composition/composition-parser.service';
import { TrafficLightService } from '../composition/traffic-light.service';
import { buildCompositionPreview } from './composition-preview';

export interface ReviewedPlan {
  mode: string;
  databaseFingerprint: string;
  analyzerFingerprint: string;
  adapterFingerprint: string;
  reviewFingerprint: string;
  rows: Array<{ id: string; sourceFingerprint: string; brandIsActive: boolean; isActive: boolean;
    proposedDescription: string | null; after: CompositionAnalysisResult; changed: boolean; approvedToApply: boolean }>;
}

export function verifyPlanDigest(plan: ReviewedPlan, confirmation: string): void {
  const { reviewFingerprint, ...unsigned } = plan;
  if (plan.mode !== 'CONSERVATIVE_REVIEW_ONLY_NO_APPLY' || confirmation !== reviewFingerprint
    || createHash('sha256').update(JSON.stringify(unsigned)).digest('hex') !== reviewFingerprint) {
    throw new Error('Plan or explicit confirmation fingerprint is invalid');
  }
  if (new Set(plan.rows.map(row => row.id)).size !== plan.rows.length) throw new Error('Duplicate products');
}

export function validateReviewedState(state: CompositionAnalysisResult): void {
  if (!['GREEN', 'YELLOW', 'RED', 'UNKNOWN'].includes(state.trafficLight)) throw new Error('Invalid color');
  for (const value of [state.naturalPercentage, state.semiSyntheticPercentage, state.syntheticPercentage, ...state.fibers.map(f => f.percentage)]) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Invalid quantity');
  }
  for (const fiber of state.fibers) {
    if (typeof fiber.fiberName !== 'string' || !fiber.fiberName.trim() || typeof fiber.isLining !== 'boolean'
      || !['NATURAL', 'SEMISYNTHETIC', 'SYNTHETIC'].includes(fiber.category)) throw new Error('Invalid fiber');
  }
  if ([false, true].some(lining => state.fibers.filter(f => f.isLining === lining).reduce((sum, f) => sum + f.percentage, 0) > 100.000001)
    || state.naturalPercentage + state.semiSyntheticPercentage + state.syntheticPercentage > 100.000001) throw new Error('Excess total');
  const evaluated = new TrafficLightService().evaluate(state.fibers);
  for (const field of ['naturalPercentage', 'semiSyntheticPercentage', 'syntheticPercentage'] as const) {
    if (Math.abs(evaluated[field] - state[field]) > 0.000001) throw new Error('Aggregates do not match fibers');
  }
  if (evaluated.hasSyntheticLining !== state.hasSyntheticLining) throw new Error('Lining mismatch');
  if (state.trafficLight !== 'UNKNOWN' && (evaluated.trafficLight !== state.trafficLight
    || state.fibers.filter(f => !f.isLining).reduce((sum, f) => sum + f.percentage, 0) < 99.9 - 0.000001)) throw new Error('Unsupported classification');
}

/** Called only by the separate, explicitly confirmed apply CLI. Tests inject a fake database. */
export async function applyReviewedPlan(prisma: PrismaService, plan: ReviewedPlan,
  backup: (snapshot: unknown) => Promise<void>) {
  const parser = new CompositionParserService(new TrafficLightService());
  plan.rows.forEach(row => validateReviewedState(row.after));
  return prisma.$transaction(async tx => {
    // Conflicts with normal INSERT/UPDATE/DELETE while allowing public readers.
    await tx.$executeRaw`LOCK TABLE "Brand", "Product", "ProductFiber" IN SHARE ROW EXCLUSIVE MODE`;
    const products = await tx.product.findMany({ include: { brand: true, fibers: true }, orderBy: { id: 'asc' } });
    const brands = await tx.brand.findMany({ orderBy: { id: 'asc' } });
    const current = buildCompositionPreview(products, parser, plan.analyzerFingerprint, plan.databaseFingerprint);
    const expected = new Map(plan.rows.map(row => [row.id, row]));
    if (current.rows.length !== expected.size) throw new Error('Product set changed; regenerate preview');
    for (const row of current.rows) {
      const planned = expected.get(row.id);
      if (!planned || planned.sourceFingerprint !== row.sourceFingerprint || planned.isActive !== row.isActive
        || planned.brandIsActive !== row.brandIsActive) throw new Error('Inputs changed; regenerate preview');
    }
    // Failure to save the backup aborts before the first product write.
    await backup({ mode: 'PRE_REPAIR_APPLICATION_DATA_BACKUP', generatedAt: new Date().toISOString(),
      reviewFingerprint: plan.reviewFingerprint, brands, products });
    let changed = 0;
    for (const row of plan.rows.filter(row => row.changed)) {
      const a = row.after;
      await tx.product.update({ where: { id: row.id }, data: {
        description: row.proposedDescription, rawComposition: a.rawComposition,
        naturalPercentage: a.naturalPercentage, semiSyntheticPercentage: a.semiSyntheticPercentage,
        syntheticPercentage: a.syntheticPercentage, trafficLight: a.trafficLight, hasSyntheticLining: a.hasSyntheticLining,
        fibers: { deleteMany: {}, create: a.fibers.map(f => ({ fiberName: f.fiberName, category: f.category, percentage: f.percentage, isLining: f.isLining })) },
      } });
      changed++;
    }
    const after = await tx.product.findMany({ include: { fibers: true }, orderBy: { id: 'asc' } });
    const sameFibers = (items: CompositionAnalysisResult['fibers']) => JSON.stringify(items.map(f => ({ fiberName: f.fiberName,
      category: f.category, percentage: f.percentage, isLining: f.isLining })).sort((a, b) => Number(a.isLining) - Number(b.isLining) || a.fiberName.localeCompare(b.fiberName) || a.percentage - b.percentage));
    for (const row of after) {
      const planned = expected.get(row.id)!;
      validateReviewedState(row);
      if (planned.changed && (row.description !== planned.proposedDescription || row.rawComposition !== planned.after.rawComposition
        || row.trafficLight !== planned.after.trafficLight || row.naturalPercentage !== planned.after.naturalPercentage
        || row.semiSyntheticPercentage !== planned.after.semiSyntheticPercentage || row.syntheticPercentage !== planned.after.syntheticPercentage
        || row.hasSyntheticLining !== planned.after.hasSyntheticLining || sameFibers(row.fibers) !== sameFibers(planned.after.fibers))) {
        throw new Error('Post-write validation failed; transaction will roll back');
      }
    }
    return { changed, validated: after.length };
  }, { isolationLevel: 'Serializable', timeout: 180000, maxWait: 15000 });
}
