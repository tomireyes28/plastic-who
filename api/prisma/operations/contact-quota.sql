-- Reviewed additive operation for the existing database. NOT executed by this change.
-- Do not reset the database or use db push to establish a migration baseline.
BEGIN;
CREATE TABLE "ContactQuota" (
  "bucket" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL CHECK ("count" >= 0 AND "count" <= 51),
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ContactQuota_expiresAt_idx" ON "ContactQuota" ("expiresAt");
COMMIT;
-- Optional maintenance after deployment: expired buckets may be deleted. No messages,
-- names, IP addresses or email addresses are stored in this table.
-- Rollback: disable contact delivery, then DROP TABLE "ContactQuota" after approval.
