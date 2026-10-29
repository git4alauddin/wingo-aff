import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../tools/serve.mjs';
test('preview serves public assets and blocks private files, traversal, and writes', async () => {
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/registration.html', '/creator-studio.html', '/js/wingo-engine.js', '/assets/images/brand.svg']) {
      const response = await fetch(base + path); assert.equal(response.status, 200, path);
    }
    for (const path of ['/package.json', '/tests/engine.test.js', '/tools/serve.mjs', '/.git/config', '/css/%2e%2e%5ctools/serve.mjs', '/js/%2e%2e%5cpackage.json']) {
      const response = await fetch(base + path); assert.equal(response.status, 404, path);
    }
    const response = await fetch(base + '/', { method: 'POST' }); assert.equal(response.status, 405);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
