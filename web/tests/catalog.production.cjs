// Black-box regression for H07. Run after build:web; all data comes from a local fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const webRoot = path.resolve(__dirname, '..');
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const close = server => new Promise(resolve => {
  server.closeAllConnections();
  server.close(resolve);
});
let state = { mode: 'ok', name: 'H07 fixture A' };
const brand = { id: 'fixture-brand', name: 'Fixture', slug: 'fixture', websiteUrl: 'https://example.invalid',
  platform: 'OTHER', isKnownBrand: false, lastScrapedAt: null, productCount: 1 };

async function startApp(apiUrl, mode) {
  const reservation = http.createServer();
  const port = await listen(reservation);
  await close(reservation);
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', webRoot,
    '--hostname', '127.0.0.1', '--port', String(port)], {
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: '', DIRECT_URL: '',
      CATALOG_API_URL: apiUrl, CATALOG_MODE: mode },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Next startup timed out')), 20000);
      let output = '';
      const fail = () => { clearTimeout(timeout); reject(new Error('Next did not start')); };
      child.once('error', fail);
      child.once('exit', fail);
      child.stderr.on('data', () => {}); // Do not print provider details on failures.
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        if (output.includes('Ready in')) {
          clearTimeout(timeout);
          child.removeListener('exit', fail);
          resolve();
        }
      });
    });
    return { child, url: `http://127.0.0.1:${port}/` };
  } catch (error) { child.kill(); throw error; }
}

async function stopApp(app) {
  if (!app || app.child.exitCode !== null || app.child.signalCode !== null) return;
  await new Promise(resolve => { app.child.once('exit', resolve); app.child.kill(); });
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(webRoot, '.next/prerender-manifest.json'), 'utf8'));
  assert.equal(manifest.routes['/'], undefined, 'Home must not be frozen in the build');
  const source = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (state.mode === 'error') { res.writeHead(503); res.end('{}'); return; }
    if (req.url.startsWith('/api/brands')) { res.end(JSON.stringify(state.mode === 'empty' ? [] : [brand])); return; }
    if (req.url.startsWith('/api/products')) {
      const product = { id: 'fixture', externalId: 'fixture', name: state.name, slug: 'fixture',
        productUrl: 'https://example.invalid/product', imageUrl: null, price: 1000, specialPrice: null,
        category: 'Fixture', rawComposition: '100% algodón', naturalPercentage: 100,
        semiSyntheticPercentage: 0, syntheticPercentage: 0, trafficLight: 'GREEN',
        hasSyntheticLining: false, inStock: true, brand,
        fibers: [{ fiberName: 'algodón', category: 'NATURAL', percentage: 100, isLining: false }] };
      res.end(JSON.stringify(state.mode === 'empty' ? [] : [product])); return;
    }
    res.writeHead(404); res.end('{}');
  });
  let live, demo;
  try {
    const sourcePort = await listen(source);
    const apiUrl = `http://127.0.0.1:${sourcePort}/api`;
    live = await startApp(apiUrl, 'live');
    const read = async () => {
      const response = await fetch(live.url, { signal: AbortSignal.timeout(15000) });
      return { status: response.status, cache: response.headers.get('cache-control'), html: await response.text() };
    };
    const first = await read();
    assert.equal(first.status, 200); assert(first.html.includes(state.name));
    state = { mode: 'ok', name: 'H07 fixture B' };
    const second = await read();
    assert.equal(second.status, 200); assert(second.html.includes(state.name));
    assert(!second.html.includes('H07 fixture A')); assert(second.cache.includes('no-store'));
    state.mode = 'error';
    const failed = await read();
    assert.equal(failed.status, 500);
    assert(!failed.html.includes('Camisa New Margarite'));
    state.mode = 'empty';
    const empty = await read();
    assert.equal(empty.status, 200); assert(empty.html.includes('no tiene prendas'));
    assert(!empty.html.includes('Camisa New Margarite'));
    state = { mode: 'ok', name: 'H07 fixture recovered' };
    const recovered = await read();
    assert.equal(recovered.status, 200); assert(recovered.html.includes(state.name));
    state.mode = 'error';
    demo = await startApp(apiUrl, 'demo');
    const demoResponse = await fetch(demo.url, { signal: AbortSignal.timeout(15000) });
    const demoHtml = await demoResponse.text();
    assert.equal(demoResponse.status, 200); assert(demoHtml.includes('Modo demostración'));
    assert(demoHtml.includes('No representan precios ni disponibilidad actuales'));
    console.log('H07 production: PASS — fresh requests, error 500, empty state, recovery and explicit demo (mock source only).');
  } finally {
    await stopApp(demo); await stopApp(live); await close(source);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
