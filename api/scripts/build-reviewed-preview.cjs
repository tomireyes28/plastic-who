// Offline, review-only consolidation. Never imports PrismaService or starts a scraper CLI.
// Usage: node api/scripts/build-reviewed-preview.cjs base.json prior.json historical-base.json sources-dir calculated-dir NEW-output-dir
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = data => createHash('sha256').update(data).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const normalizeName = value => (value || '').replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&amp;/g, '&')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const canonical = state => ({ ...state, fibers: [...state.fibers].sort((a, b) => Number(a.isLining) - Number(b.isLining)
  || a.fiberName.localeCompare(b.fiberName) || a.percentage - b.percentage) });
const comparable = state => JSON.stringify({ ...canonical(state), rawComposition: null });
function validate(state) {
  for (const value of [state.naturalPercentage, state.semiSyntheticPercentage, state.syntheticPercentage, ...state.fibers.map(f => f.percentage)]) {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 100, 'Invalid amount');
  }
  for (const lining of [false, true]) assert.ok(state.fibers.filter(f => f.isLining === lining).reduce((s, f) => s + f.percentage, 0) <= 100.000001);
  assert.ok(state.naturalPercentage + state.semiSyntheticPercentage + state.syntheticPercentage <= 100.000001);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 6) throw new Error('Expected base.json prior.json historical-base.json sources-dir calculated-dir NEW-output-dir');
  const [baseFile, priorFile, historicalFile, sourceDir, calculatedDir, output] = args.map(file => path.resolve(file));
  assert.ok(!fs.existsSync(output), 'Output must be new');
  const base = read(baseFile), prior = read(priorFile);
  const historical = read(historicalFile);
  assert.equal(base.databaseFingerprint, historical.databaseFingerprint, 'Wrong database identity');
  assert.equal(prior.baselineSnapshotFingerprint, historical.snapshotFingerprint, 'Review refers to a different snapshot');
  const old = new Map(prior.rows.map(row => [row.id, row]));
  assert.equal(old.size, base.rows.length, 'Product set changed; review again');
  const declarations = new Set(prior.reviewedDeclarations.map(row => row.id));
  const sources = new Map();
  for (const [folder, records] of [[sourceDir, read(path.join(sourceDir, 'sources.json')).records],
    [calculatedDir, read(path.join(calculatedDir, 'inspected-sources.json'))]]) {
    for (const record of records) {
      assert.ok(/^[a-f0-9-]{36}$/.test(record.id) && !sources.has(record.id), 'Invalid/duplicate source id');
      sources.set(record.id, { folder, record });
    }
  }
  const { CompositionParserService } = require('../dist/composition/composition-parser.service');
  const { TrafficLightService } = require('../dist/composition/traffic-light.service');
  const parser = new CompositionParserService(new TrafficLightService());
  const analyzer = createHash('sha256');
  for (const file of ['composition/composition-parser.service.js', 'composition/fiber-dictionary.js', 'composition/traffic-light.service.js', 'catalog/composition-preview.js']) {
    analyzer.update(fs.readFileSync(path.join(root, 'api/dist', file)));
  }
  assert.equal(analyzer.digest('hex'), base.analyzerFingerprint, 'Analyzer changed after snapshot');
  const adapters = {};
  for (const [brand, name] of Object.entries({ wanama: 'Wanama', rapsodia: 'Rapsodia', markova: 'Markova',
    'paula-cahen-danvers': 'PaulaCahenDanvers', 'funky-monkeys': 'FunkyMonkeys', 'reir-enloquecer': 'ReirEnloquecer',
    'one-place-world': 'OnePlaceWorld', 'india-style': 'IndiaStyle', kosiuko: 'Kosiuko' })) {
    adapters[brand] = new (require(`../dist/scraper/adapters/${brand}-scraper.adapter`)[`${name}ScraperAdapter`])();
  }
  const { VtexScraperAdapter } = require('../dist/scraper/adapters/vtex-scraper.adapter');
  const adapterHash = createHash('sha256');
  for (const brand of [...Object.keys(adapters), 'vtex']) adapterHash.update(fs.readFileSync(path.join(root, `api/dist/scraper/adapters/${brand}-scraper.adapter.js`)));
  adapterHash.update(fs.readFileSync(path.join(root, 'api/dist/scraper/fetch-store.js')));
  const statuses = {}, rows = [];
  for (const row of base.rows) {
    const previous = old.get(row.id);
    assert.ok(previous && previous.sourceFingerprint === row.sourceFingerprint, `Stale input: ${row.id}`);
    assert.deepEqual(row.before, previous.before);
    let source = null;
    const capture = sources.get(row.id);
    if (capture) {
      const { record, folder } = capture;
      assert.equal(record.originalSourceFingerprint || record.historicalSourceFingerprint, row.sourceFingerprint);
      const file = path.join(folder, `${row.id}.html`), bytes = fs.readFileSync(file);
      assert.equal(hash(bytes), record.htmlFingerprint, 'Evidence changed');
      source = { status: record.httpStatus === 200 ? 'EXTRACTION_PENDING' : 'UNAVAILABLE', httpStatus: record.httpStatus,
        capturedAt: record.capturedAt, htmlFingerprint: record.htmlFingerprint, htmlFile: path.relative(output, file) };
      if (record.httpStatus === 200) {
        let product;
        if (adapters[row.brand]) {
          const adapter = adapters[row.brand], nativeFetch = global.fetch;
          global.fetch = async url => { assert.equal(String(url), record.requestedUrl, 'Offline replay attempted another URL'); return new Response(bytes); };
          try {
            product = adapter.parseProductFromHtml ? adapter.parseProductFromHtml(bytes.toString('utf8'), record.requestedUrl.split('/productos/')[1])
              : await adapter.fetchProductDetail(record.requestedUrl);
          } finally { global.fetch = nativeFetch; }
        } else if (record.scopedVtexFields) {
          const fields = record.scopedVtexFields;
          const adapter = new VtexScraperAdapter({ name: row.brand, slug: row.brand, websiteUrl: new URL(record.requestedUrl).origin, platform: 'VTEX', isKnownBrand: true });
          product = adapter.mapVtexItem({ productId: fields.productId, productName: fields.name, linkText: fields.slug,
            link: record.requestedUrl, description: fields.description, Composición: fields.composition });
        }
        if (product && normalizeName(product.name) === normalizeName(row.name)) source = { ...source, status: 'REPLAYED',
          description: product.description, analysis: canonical(parser.parseFromText(product.description)) };
      }
    }
    let after = row.after, proposedDescription = row.description, decision = 'STORED_TEXT_ANALYSIS';
    if (declarations.has(row.id)) {
      if (previous.reviewedEvidence?.method?.includes('VISUAL') || previous.after.fibers.some(f => f.fiberName === 'bambú')) {
        // Retain the reviewed image transcription as such, never as invented natural fiber.
        const evidence = previous.reviewedEvidence;
        assert.ok(evidence?.imageFile && evidence.imageFingerprint && evidence.declaration, 'Missing visual evidence');
        assert.equal(hash(fs.readFileSync(path.resolve(path.dirname(priorFile), evidence.imageFile))), evidence.imageFingerprint, 'Visual evidence changed');
        after = canonical(parser.parseFromText(evidence.declaration));
        assert.equal(after.trafficLight, 'UNKNOWN');
        proposedDescription = source?.description ?? '';
        decision = 'VISUAL_LABEL_UNIDENTIFIED_BAMBOO_UNKNOWN';
      } else if (source?.status === 'REPLAYED' && source.analysis.trafficLight === 'UNKNOWN' && /\bmicrofibra\b/i.test(source.description)) {
        after = source.analysis; proposedDescription = source.description; decision = 'UNIDENTIFIED_MICROFIBER_UNKNOWN';
      } else {
        assert.equal(source?.status, 'REPLAYED', `Reviewed declaration not extracted: ${row.id}`);
        assert.equal(comparable(source.analysis), comparable(previous.after), `Reviewed declaration differs: ${row.id}`);
        after = source.analysis; proposedDescription = source.description; decision = 'CONFIRMED_SOURCE_REPRODUCED_BY_CODE';
      }
    } else if (previous.sourceReviewRequired || previous.calculatedReviewRequired) {
      proposedDescription = source?.status === 'REPLAYED' ? source.description : previous.sourceReviewRequired ? '' : row.description;
      after = canonical(parser.parseFromText(proposedDescription || ''));
      after.trafficLight = 'UNKNOWN';
      decision = previous.sourceReviewRequired ? 'UNRESOLVED_LEGACY_PUBLISH_UNKNOWN' : 'UNRESOLVED_CALCULATED_PUBLISH_UNKNOWN';
    } else if (source?.status === 'REPLAYED' && previous.after.trafficLight === 'UNKNOWN') {
      after = { ...source.analysis, trafficLight: 'UNKNOWN' };
      proposedDescription = source.description; decision = 'CHECKED_INSUFFICIENT_SOURCE_UNKNOWN';
    }
    validate(after);
    statuses[decision] = (statuses[decision] || 0) + 1;
    const reviewedEvidence = previous.reviewedEvidence ? { ...previous.reviewedEvidence } : null;
    if (reviewedEvidence) for (const field of ['imageFile', 'htmlFile', 'evidenceFile']) {
      if (reviewedEvidence[field]) reviewedEvidence[field] = path.relative(output, path.resolve(path.dirname(priorFile), reviewedEvidence[field]));
    }
    rows.push({ ...row, after: canonical(after), proposedDescription, decision, source,
      reviewedEvidence, approvedToApply: false,
      changed: JSON.stringify(canonical(row.before)) !== JSON.stringify(canonical(after)) || row.description !== proposedDescription });
  }
  assert.equal(statuses.CONFIRMED_SOURCE_REPRODUCED_BY_CODE, declarations.size - 33);
  assert.equal(statuses.VISUAL_LABEL_UNIDENTIFIED_BAMBOO_UNKNOWN, 32);
  assert.equal(statuses.UNIDENTIFIED_MICROFIBER_UNKNOWN, 1);
  const summary = { total: rows.length, changed: rows.filter(r => r.changed).length,
    changedAnalysis: rows.filter(r => JSON.stringify(r.before) !== JSON.stringify(r.after)).length,
    changedDescription: rows.filter(r => r.description !== r.proposedDescription).length,
    changedColors: rows.filter(r => r.before.trafficLight !== r.after.trafficLight).length,
    proposedColors: Object.fromEntries(['GREEN', 'YELLOW', 'RED', 'UNKNOWN'].map(color => [color, rows.filter(r => r.after.trafficLight === color).length])),
    invalidTotalsProposed: 0, approvedToApply: 0, statuses };
  const result = { mode: 'CONSERVATIVE_REVIEW_ONLY_NO_APPLY', generatedAt: new Date().toISOString(),
    databaseFingerprint: base.databaseFingerprint, analyzerFingerprint: base.analyzerFingerprint,
    adapterFingerprint: adapterHash.digest('hex'), baseFingerprint: hash(fs.readFileSync(baseFile)),
    priorFingerprint: hash(fs.readFileSync(priorFile)), generatorFingerprint: hash(fs.readFileSync(__filename)),
    policy: 'Unverified evidence remains UNKNOWN; unidentified bamboo and microfiber remain UNKNOWN; no automatic approvals.', summary, rows };
  result.reviewFingerprint = hash(JSON.stringify(result));
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(output, 'preview.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
