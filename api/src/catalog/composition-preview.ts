import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { CompositionAnalysisResult, CompositionParserService } from '../composition/composition-parser.service';
import { ParsedFiberItem } from '../composition/traffic-light.service';
import { PrismaService } from '../prisma/prisma.service';

export const PREVIEW_SELECT = {
  id: true, name: true, productUrl: true, isActive: true, updatedAt: true,
  description: true, rawComposition: true, naturalPercentage: true,
  semiSyntheticPercentage: true, syntheticPercentage: true, trafficLight: true,
  hasSyntheticLining: true,
  brand: { select: { slug: true, name: true, isActive: true } },
  fibers: { select: { fiberName: true, category: true, percentage: true, isLining: true } },
} satisfies Prisma.ProductSelect;

export type PreviewProduct = Prisma.ProductGetPayload<{ select: typeof PREVIEW_SELECT }>;

/** No scraper module or brand registration is involved. PostgreSQL also rejects writes. */
export async function readCompositionSnapshot(prisma: PrismaService): Promise<PreviewProduct[]> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return tx.product.findMany({ select: PREVIEW_SELECT, orderBy: { id: 'asc' } });
  }, { isolationLevel: 'RepeatableRead', timeout: 60000, maxWait: 15000 });
}

function canonicalFibers(fibers: ParsedFiberItem[]): ParsedFiberItem[] {
  return fibers.map(f => ({
    fiberName: f.fiberName, category: f.category, percentage: f.percentage, isLining: f.isLining,
  })).sort((a, b) => Number(a.isLining) - Number(b.isLining)
    || a.fiberName.localeCompare(b.fiberName) || a.percentage - b.percentage);
}

function canonicalState(state: CompositionAnalysisResult): CompositionAnalysisResult {
  return {
    rawComposition: state.rawComposition, fibers: canonicalFibers(state.fibers),
    naturalPercentage: state.naturalPercentage, semiSyntheticPercentage: state.semiSyntheticPercentage,
    syntheticPercentage: state.syntheticPercentage, trafficLight: state.trafficLight,
    hasSyntheticLining: state.hasSyntheticLining,
  };
}

/** These signatures indicate possible legacy inference, not proof of a source declaration. */
function requiresSourceReview(product: PreviewProduct): string | null {
  const text = product.description ?? '';
  if (!text.trim()) return 'MISSING_ORIGINAL_DESCRIPTION';
  if (product.brand.slug === 'one-place-world'
    && /Línea de Bambú One Place World\.[\s\S]*Composición:\s*96% bambú y 4% elastano/i.test(text)) {
    return 'POSSIBLY_INFERRED_BAMBOO';
  }
  if (product.brand.slug === 'reir-enloquecer'
    && /\nComposición:\s*100%\s*(?:algodón|poliéster\s*\(microtul\))\.\s*$/i.test(text)) {
    return 'POSSIBLY_INFERRED_COTTON_OR_MICROTUL';
  }
  if (product.brand.slug === 'funky-monkeys'
    && /\n(?:Composición:\s*100%\s*(?:algodón|viscosa)\.|Exterior:\s*100% poliéster\. Forrería:\s*100% algodón\.)\s*$/i.test(text)) {
    return 'POSSIBLY_INFERRED_FUNKY_COMPOSITION';
  }
  return null;
}

function exceedsTotal(state: CompositionAnalysisResult): boolean {
  const amounts = [state.naturalPercentage, state.semiSyntheticPercentage, state.syntheticPercentage,
    ...state.fibers.map(f => f.percentage)];
  return amounts.some(value => !Number.isFinite(value) || value < 0 || value > 100)
    || [false, true].some(lining => state.fibers.filter(f => f.isLining === lining)
    .reduce((sum, f) => sum + f.percentage, 0) > 100.000001)
    || state.naturalPercentage + state.semiSyntheticPercentage + state.syntheticPercentage > 100.000001;
}

export function buildCompositionPreview(
  products: PreviewProduct[], parser: CompositionParserService, analyzerFingerprint: string,
  databaseFingerprint = 'not-specified',
) {
  const rows = products.map(product => {
    const before = canonicalState(product);
    const sourceReviewReason = requiresSourceReview(product);
    const after = canonicalState(sourceReviewReason ? {
      rawComposition: product.rawComposition,
      fibers: [], naturalPercentage: 0, semiSyntheticPercentage: 0, syntheticPercentage: 0,
      trafficLight: 'UNKNOWN', hasSyntheticLining: false,
    } : parser.parseFromText(product.description!));
    const reasons: string[] = [];
    if (sourceReviewReason) reasons.push(sourceReviewReason);
    if (exceedsTotal(before)) reasons.push('INVALID_STORED_TOTAL');
    if (before.trafficLight !== after.trafficLight) reasons.push('COLOR_CHANGED');
    if (!sourceReviewReason && after.trafficLight === 'UNKNOWN') reasons.push('INSUFFICIENT_OR_UNSUPPORTED_EVIDENCE');
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    return {
      id: product.id, name: product.name, brand: product.brand.slug, productUrl: product.productUrl,
      isActive: product.isActive, brandIsActive: product.brand.isActive,
      expectedUpdatedAt: product.updatedAt.toISOString(),
      // Preserve the original input and old state for review. This is not a full DB backup.
      description: product.description,
      sourceFingerprint: createHash('sha256').update(JSON.stringify({
        id: product.id, updatedAt: product.updatedAt, description: product.description, before,
      })).digest('hex'),
      sourceReviewRequired: !!sourceReviewReason,
      action: sourceReviewReason ? 'REVIEW_SOURCE' as const : changed ? 'REANALYZE' as const : 'UNCHANGED' as const,
      changed, reasons, before, after,
    };
  });
  const colors = ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'] as const;
  const countColors = (field: 'before' | 'after') => Object.fromEntries(colors.map(color => [
    color, rows.filter(row => row[field].trafficLight === color).length,
  ]));
  const transitions: Record<string, number> = {};
  for (const row of rows) {
    const key = `${row.before.trafficLight} -> ${row.after.trafficLight}`;
    transitions[key] = (transitions[key] ?? 0) + 1;
  }
  return {
    mode: 'READ_ONLY_PREVIEW' as const,
    generatedAt: new Date().toISOString(), analyzerFingerprint, databaseFingerprint,
    snapshotFingerprint: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    summary: {
      total: rows.length, changed: rows.filter(r => r.changed).length,
      changedVisible: rows.filter(r => r.changed && r.isActive && r.brandIsActive).length,
      sourceReviewRequired: rows.filter(r => r.sourceReviewRequired).length,
      invalidTotalsBefore: rows.filter(r => exceedsTotal(r.before)).length,
      invalidTotalsProposed: rows.filter(r => exceedsTotal(r.after)).length,
      beforeColors: countColors('before'), proposedColors: countColors('after'), transitions,
    },
    rows,
  };
}

export type CompositionPreview = ReturnType<typeof buildCompositionPreview>;

const cell = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/[\r\n]+/g, ' ');

export function renderCompositionPreview(preview: CompositionPreview): string {
  const s = preview.summary;
  const brands = [...new Set(preview.rows.map(r => r.brand))].sort();
  const percentages = (state: CompositionAnalysisResult) =>
    `${state.naturalPercentage} / ${state.semiSyntheticPercentage} / ${state.syntheticPercentage}`;
  return [
    '# H06 — Vista previa del reprocesamiento', '',
    `Generada: ${preview.generatedAt}. Modo: **solo lectura**. No se aplicó ningún cambio.`, '',
    `Productos: **${s.total}**. Cambios propuestos: **${s.changed}** (${s.changedVisible} visibles).`,
    `Requieren revisar la fuente: **${s.sourceReviewRequired}**. Totales inválidos: **${s.invalidTotalsBefore} → ${s.invalidTotalsProposed}**.`, '',
    '## Cómo interpretar la propuesta', '',
    '- REANALYZE: recalcular desde la descripción completa almacenada con el parser y la política corregidos.',
    '- REVIEW_SOURCE: falta el texto original o coincide con firmas de inferencias antiguas. Se propone retirar la clasificación y las fibras hasta verificar la ficha; no se afirma que la marca declare esos porcentajes.',
    '- UNKNOWN no significa automáticamente que la marca omitió información: también puede ser una declaración parcial o un formato no soportado.',
    '- La propuesta solo afecta composición, porcentajes, color, aviso de forro y fibras. No cambia precios, stock, marcas ni estado activo.',
    '- El JSON conserva antes/después, texto de entrada, fecha esperada y huellas. No es un respaldo completo de la base ni un permiso para aplicar cambios.', '',
    'Los porcentajes de las tablas se expresan como natural / semisintético / sintético del exterior. GREEN = verde; YELLOW = amarillo; RED = rojo; UNKNOWN = sin clasificar.', '',
    '## Colores', '', '| Color | Actual | Propuesto |', '|---|---:|---:|',
    ...Object.keys(s.beforeColors).map(color => `| ${color} | ${s.beforeColors[color]} | ${s.proposedColors[color]} |`), '',
    '## Por marca', '', '| Marca | Productos | Cambios | Revisar fuente |', '|---|---:|---:|---:|',
    ...brands.map(brand => {
      const rows = preview.rows.filter(r => r.brand === brand);
      return `| ${cell(brand)} | ${rows.length} | ${rows.filter(r => r.changed).length} | ${rows.filter(r => r.sourceReviewRequired).length} |`;
    }), '',
    '## Cambios y casos para revisar', '',
    'Los detalles de porcentajes y fibras están en `preview.json`, buscando el ID indicado.', '',
    '| ID | Marca | Producto | Color actual → propuesto | % actual → propuesto | Forro sintético actual → propuesto | Acción | Motivos |', '|---|---|---|---|---|---|---|---|',
    ...preview.rows.filter(r => r.changed || r.sourceReviewRequired).map(r =>
      `| ${r.id} | ${cell(r.brand)} | ${cell(r.name)} | ${r.before.trafficLight} → ${r.after.trafficLight} | ${percentages(r.before)} → ${percentages(r.after)} | ${r.before.hasSyntheticLining ? 'sí' : 'no'} → ${r.after.hasSyntheticLining ? 'sí' : 'no'} | ${r.action} | ${r.reasons.join(', ')} |`), '',
    'Antes de aplicar: revisar los casos de fuente dudosa, respaldar la base y volver a comprobar versiones/huellas para no sobrescribir productos modificados desde esta lectura.', '',
  ].join('\n');
}
