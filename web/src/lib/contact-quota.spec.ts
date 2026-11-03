import { readContactBody, reserveContactDelivery } from './contact-quota';
import { prisma } from './prisma';

jest.mock('./prisma', () => ({ prisma: { $queryRaw: jest.fn() } }));

const saved = { ...process.env };
describe('Shared mail quota and bounded input (H08)', () => {
  beforeEach(() => { delete process.env.DATABASE_URL; Object.assign(process.env, { NODE_ENV: 'production', UPSTASH_REDIS_REST_URL: 'https://quota.invalid', UPSTASH_REDIS_REST_TOKEN: 'fixture' }); });
  afterEach(() => { jest.restoreAllMocks(); for (const key of ['DATABASE_URL', 'NODE_ENV', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  it.each([{ result: 1, expected: 'allowed' }, { result: 0, expected: 'limited' }, { result: null, expected: 'unavailable' }])('uses an atomic shared reservation: %p', async ({ result, expected }) => {
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result })));
    expect(await reserveContactDelivery(0)).toBe(expected);
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)[0]).toBe('EVAL');
  });
  it('fails closed in production without the shared store', async () => {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(await reserveContactDelivery()).toBe('unavailable');
  });
  it('fails closed on store errors', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('unavailable'));
    expect(await reserveContactDelivery()).toBe('unavailable');
  });
  it.each([{ allowed: true, result: 'allowed' }, { allowed: false, result: 'limited' }])('uses the existing PostgreSQL atomically: %p', async ({ allowed, result }) => {
    process.env.DATABASE_URL = 'fixture-only';
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ allowed }]);
    expect(await reserveContactDelivery(0)).toBe(result);
  });
  it('fails closed if the PostgreSQL quota table is not provisioned', async () => {
    process.env.DATABASE_URL = 'fixture-only';
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('missing table'));
    expect(await reserveContactDelivery()).toBe('unavailable');
  });
  it('reads JSON within the limit', async () => {
    expect(await readContactBody(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"Sofía"}' }))).toEqual({ name: 'Sofía' });
  });
  it('limits actual bytes even without Content-Length', async () => {
    await expect(readContactBody(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(25000) }))).rejects.toThrow('TOO_LARGE');
  });
});
