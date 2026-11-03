// Write-capable command. Do not run until the exact review hash is explicitly approved.
const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { ConfigModule } = require('@nestjs/config');
const configuration = ConfigModule.forRoot({ envFilePath: path.resolve(__dirname, '../.env') });
const { verifyPlanDigest, applyReviewedPlan } = require('../dist/catalog/apply-reviewed-preview');
const hash = data => createHash('sha256').update(data).digest('hex');
async function main() {
  await configuration;
  const [planFile, confirmation, backupDir] = process.argv.slice(2);
  if (!planFile || !confirmation || !backupDir || process.argv.length !== 5) throw new Error('Expected plan.json exact-approved-review-hash NEW-backup-dir');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  verifyPlanDigest(plan, confirmation);
  if (fs.existsSync(path.resolve(__dirname, '../.scrape.lock'))) throw new Error('Stop the scraping process before repair');
  const database = new URL(process.env.DATABASE_URL);
  const destination = hash([database.hostname, database.port, database.pathname, database.username].join('|'));
  if (destination !== plan.databaseFingerprint) throw new Error('Wrong database');
  const analyzer = createHash('sha256');
  for (const file of ['composition/composition-parser.service.js', 'composition/fiber-dictionary.js', 'composition/traffic-light.service.js', 'catalog/composition-preview.js']) analyzer.update(fs.readFileSync(path.resolve(__dirname, '../dist', file)));
  if (analyzer.digest('hex') !== plan.analyzerFingerprint) throw new Error('Analyzer changed');
  const adapters = createHash('sha256');
  for (const brand of ['wanama', 'rapsodia', 'markova', 'paula-cahen-danvers', 'funky-monkeys', 'reir-enloquecer', 'one-place-world', 'india-style', 'kosiuko', 'vtex']) adapters.update(fs.readFileSync(path.resolve(__dirname, `../dist/scraper/adapters/${brand}-scraper.adapter.js`)));
  adapters.update(fs.readFileSync(path.resolve(__dirname, '../dist/scraper/fetch-store.js')));
  if (adapters.digest('hex') !== plan.adapterFingerprint) throw new Error('Adapters changed');
  if (fs.existsSync(backupDir)) throw new Error('Backup directory must be new');
  fs.mkdirSync(backupDir, { recursive: false });
  const prisma = new PrismaClient();
  try {
    const result = await applyReviewedPlan(prisma, plan, async snapshot => {
      const bytes = JSON.stringify(snapshot, null, 2) + '\n';
      fs.writeFileSync(path.join(backupDir, 'application-data-before.json'), bytes, { flag: 'wx' });
      fs.writeFileSync(path.join(backupDir, 'BACKUP-SHA256.txt'), hash(bytes) + '\n', { flag: 'wx' });
    });
    fs.writeFileSync(path.join(backupDir, 'RECEIPT.json'), JSON.stringify({ reviewFingerprint: plan.reviewFingerprint, appliedAt: new Date().toISOString(), ...result }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(result));
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Repair failed. Inspect the approved plan and backup; no receipt means commit status must be checked before retrying.'); process.exitCode = 1; });
