const HOUR = 3600000;
const DAY = 24 * HOUR;
let local = { hour: -1, day: -1, hourly: 0, daily: 0 };

/** Global mail budgets avoid trusting spoofable client IP headers. */
export async function reserveContactDelivery(now = Date.now()): Promise<'allowed' | 'limited' | 'unavailable'> {
  const hour = Math.floor(now / HOUR), day = Math.floor(now / DAY);
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const h = `hour:${hour}`, d = `day:${day}`;
      const rows = await prisma.$queryRaw<{ allowed: boolean }[]>`
        WITH hourly AS (
          INSERT INTO "ContactQuota" ("bucket", "count", "expiresAt") VALUES (${h}, 1, ${new Date((hour + 1) * HOUR)})
          ON CONFLICT ("bucket") DO UPDATE SET "count" = LEAST("ContactQuota"."count" + 1, 11)
          RETURNING "count"
        ), daily AS (
          INSERT INTO "ContactQuota" ("bucket", "count", "expiresAt") VALUES (${d}, 1, ${new Date((day + 1) * DAY)})
          ON CONFLICT ("bucket") DO UPDATE SET "count" = LEAST("ContactQuota"."count" + 1, 51)
          RETURNING "count"
        ) SELECT (hourly."count" <= 10 AND daily."count" <= 50) AS allowed FROM hourly, daily
      `;
      return rows[0]?.allowed === true ? 'allowed' : rows[0]?.allowed === false ? 'limited' : 'unavailable';
    } catch { return 'unavailable'; }
  }
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      if (new URL(url).protocol !== 'https:') return 'unavailable';
      const script = `local h=redis.call('INCR',KEYS[1]); if h==1 then redis.call('EXPIRE',KEYS[1],3600) end; local d=redis.call('INCR',KEYS[2]); if d==1 then redis.call('EXPIRE',KEYS[2],86400) end; if h<=10 and d<=50 then return 1 else return 0 end`;
      const response = await fetch(url, {
        method: 'POST', signal: AbortSignal.timeout(5000), cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', script, '2', `plasticwho:contact:hour:${hour}`, `plasticwho:contact:day:${day}`]),
      });
      if (!response.ok) return 'unavailable';
      const data = await response.json();
      return data.result === 1 ? 'allowed' : data.result === 0 ? 'limited' : 'unavailable';
    } catch { return 'unavailable'; }
  }
  // Only local development/tests may use a process-local quota.
  if (process.env.NODE_ENV === 'production') return 'unavailable';
  if (local.hour !== hour) { local.hour = hour; local.hourly = 0; }
  if (local.day !== day) { local.day = day; local.daily = 0; }
  local.hourly++; local.daily++;
  return local.hourly <= 10 && local.daily <= 50 ? 'allowed' : 'limited';
}

export async function readContactBody(request: Request): Promise<unknown> {
  const maxBytes = 24 * 1024;
  if (Number(request.headers.get('content-length')) > maxBytes) throw new Error('TOO_LARGE');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('INVALID_BODY');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = async () => {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maxBytes) throw new Error('TOO_LARGE');
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  try {
    return await Promise.race([read(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('INVALID_BODY')), 5000);
    })]);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
import { prisma } from './prisma';

