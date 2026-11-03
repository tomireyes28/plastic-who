import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { POST } from './route';

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
const valid = { name: '<b>Sofía</b>', email: 'sofia@example.com', message: '<img src=x onerror=alert(1)>' };
const keys = ['RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_EMAIL'];
const saved = { ...process.env };
const request = (body: unknown = valid) => new NextRequest('http://localhost/api/contact', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
describe('Honest contact delivery (H14)', () => {
  beforeEach(() => { keys.forEach(key => delete process.env[key]); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); keys.forEach(key => { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }); });
  it('returns unavailable without credentials and never logs message contents', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const res = await POST(request());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('success', true);
    expect(log).not.toHaveBeenCalled();
  });
  it.each([new Response('{}'), new Response('{}', { status: 429 })])('does not report success without provider acceptance', async response => {
    process.env.RESEND_API_KEY = 'test-only';
    jest.spyOn(global, 'fetch').mockResolvedValue(response);
    expect((await POST(request())).status).toBe(502);
  });
  it('reports success only on acceptance and escapes the HTML actually sent', async () => {
    process.env.RESEND_API_KEY = 'test-only';
    const send = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"id":"fixture"}'));
    expect((await POST(request())).status).toBe(200);
    const payload = JSON.parse(send.mock.calls[0][1]?.body as string);
    expect(payload.html).toContain('&lt;img'); expect(payload.html).not.toContain('<img');
    expect(payload.text).toContain(valid.message);
  });
  it.each([{ accepted: [] }, { accepted: ['info@plasticwho.com'] }])('checks the SMTP recipient acceptance: %p', async ({ accepted }) => {
    process.env.SMTP_HOST = 'test.invalid'; process.env.SMTP_USER = 'test'; process.env.SMTP_PASS = 'test';
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: jest.fn().mockResolvedValue({ accepted }) });
    expect((await POST(request())).status).toBe(accepted.length ? 200 : 502);
  });
  it('rejects invalid fields before requesting delivery', async () => {
    const send = jest.spyOn(global, 'fetch');
    expect((await POST(request({ ...valid, email: ['invalid'] }))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
