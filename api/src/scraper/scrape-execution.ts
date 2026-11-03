import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export function parseScrapeArguments(target = 'all', maximum = '30') {
  if (!/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/i.test(target)) throw new Error('Invalid brand selection');
  if (!/^\d+$/.test(maximum) || Number(maximum) < 1 || Number(maximum) > 1000) throw new Error('maxProducts must be an integer from 1 to 1000');
  return { target: target.toLowerCase(), maxProducts: Number(maximum) };
}

/** Exclusive per-workspace lock, paired with Actions concurrency across hosted runs. */
export function acquireScrapeLock(file: string): () => void {
  const owner = `${process.pid}:${randomUUID()}`;
  let descriptor: number;
  try { descriptor = openSync(file, 'wx'); } catch { throw new Error('Another scrape holds the workspace lock; verify the previous process before removing a stale lock'); }
  try { writeFileSync(descriptor, owner); } finally { closeSync(descriptor); }
  return () => {
    try { if (readFileSync(file, 'utf8') === owner) unlinkSync(file); } catch { /* Already released. */ }
  };
}
