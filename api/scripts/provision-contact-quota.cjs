// Add only the reviewed quota table after the explicitly authorized H06 repair.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { ConfigModule } = require('@nestjs/config');
const { PrismaClient } = require('@prisma/client');
const configuration = ConfigModule.forRoot({ envFilePath: path.resolve(__dirname, '../.env') });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function main() {
  await configuration;
  const [planFile, confirmation, backupDir] = process.argv.slice(2);
  if (!planFile || !confirmation || !backupDir || process.argv.length !== 5) throw new Error('Expected plan.json approved-hash existing-backup-dir');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const { verifyPlanDigest } = require('../dist/catalog/apply-reviewed-preview');
  verifyPlanDigest(plan, confirmation);
  const receipt = JSON.parse(fs.readFileSync(path.join(backupDir, 'RECEIPT.json')));
  assert.equal(receipt.reviewFingerprint, confirmation);
  const backup = fs.readFileSync(path.join(backupDir, 'application-data-before.json'));
  assert.equal(hash(backup), fs.readFileSync(path.join(backupDir, 'BACKUP-SHA256.txt'), 'utf8').trim());
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(hash([url.hostname, url.port, url.pathname, url.username].join('|')), plan.databaseFingerprint);
  const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/operations/contact-quota.sql'), 'utf8');
  const statements = sql.replace(/^\s*--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean);
  assert.equal(statements.shift(), 'BEGIN'); assert.equal(statements.pop(), 'COMMIT'); assert.equal(statements.length, 4);
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.$queryRaw`SELECT to_regclass('"ContactQuota"')::text AS name`;
    if (existing[0]?.name) throw new Error('ContactQuota already exists; inspect before retrying');
    await prisma.$transaction(async tx => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      const status = await tx.$queryRaw`SELECT relrowsecurity AS "rlsEnabled", relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user) AS "ownerAccess" FROM pg_class WHERE oid = '"ContactQuota"'::regclass`;
      assert.equal(status[0]?.rlsEnabled, true); assert.equal(status[0]?.ownerAccess, true);
      assert.equal(await tx.contactQuota.count(), 0);
    }, { timeout: 30000 });
    fs.writeFileSync(path.join(backupDir, 'CONTACT-QUOTA-RECEIPT.json'), JSON.stringify({
      createdAt: new Date().toISOString(), reviewFingerprint: confirmation, sqlFingerprint: hash(sql),
      table: 'ContactQuota', rlsEnabled: true, publicPolicies: 0, rows: 0,
    }, null, 2) + '\n', { flag: 'wx' });
    console.log('ContactQuota created, empty, with RLS enabled and server-owner access.');
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Quota provisioning failed. Inspect table state before retrying.'); process.exitCode = 1; });
