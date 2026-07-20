const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpFile = path.join(os.tmpdir(), `data-server-${process.pid}-${Date.now()}.json`);
fs.writeFileSync(tmpFile, JSON.stringify({ features: {}, subscriptions: {} }));
process.env.DATA_FILE = tmpFile;

const server = require('../server');

let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.unlinkSync(tmpFile);
});

test('POST /features creates a feature', async () => {
  const res = await fetch(`${baseUrl}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featureId: 'dark-mode', displayName: 'Dark Mode', price: 4.99 }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.featureId, 'dark-mode');
});

test('POST /features rejects a missing price', async () => {
  const res = await fetch(`${baseUrl}/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featureId: 'no-price', displayName: 'No Price' }),
  });
  assert.equal(res.status, 400);
});

test('GET /features/:id returns the feature', async () => {
  const res = await fetch(`${baseUrl}/features/dark-mode`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.displayName, 'Dark Mode');
});

test('GET /features/:id 404s for an unknown feature', async () => {
  const res = await fetch(`${baseUrl}/features/nope`);
  assert.equal(res.status, 404);
});

test('GET /billing/:id/state is inactive before activation', async () => {
  const res = await fetch(`${baseUrl}/billing/dark-mode/state`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.active, false);
  assert.equal(body.subscription, null);
});

test('GET /billing/:id/state 404s for an unknown feature', async () => {
  const res = await fetch(`${baseUrl}/billing/nope/state`);
  assert.equal(res.status, 404);
});

test('POST /billing/:id/activate creates an active subscription', async () => {
  const res = await fetch(`${baseUrl}/billing/dark-mode/activate`, { method: 'POST' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, 'active');
  assert.equal(body.featureId, 'dark-mode');
});

test('GET /billing/:id/state is active after activation', async () => {
  const res = await fetch(`${baseUrl}/billing/dark-mode/state`);
  const body = await res.json();
  assert.equal(body.active, true);
});

test('POST /billing/:id/activate is idempotent', async () => {
  const res = await fetch(`${baseUrl}/billing/dark-mode/activate`, { method: 'POST' });
  assert.equal(res.status, 200);
});

test('unknown routes 404', async () => {
  const res = await fetch(`${baseUrl}/nope`);
  assert.equal(res.status, 404);
});
