const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpFile = path.join(os.tmpdir(), `data-${process.pid}-${Date.now()}.json`);
fs.writeFileSync(tmpFile, JSON.stringify({ features: {}, subscriptions: {} }));
process.env.DATA_FILE = tmpFile;

const db = require('../data');

test('saveFeature and getFeature round-trip', () => {
  const feature = { featureId: 'dark-mode', displayName: 'Dark Mode', price: 4.99 };
  db.saveFeature(feature);
  assert.deepEqual(db.getFeature('dark-mode'), feature);
});

test('getFeature returns null for unknown feature', () => {
  assert.equal(db.getFeature('does-not-exist'), null);
});

test('saveSubscription and getSubscription round-trip', () => {
  const subscription = {
    subscriptionId: 'sub-1',
    featureId: 'dark-mode',
    orgId: 'org-1',
    status: 'active',
    activatedAt: new Date(0).toISOString(),
  };
  db.saveSubscription(subscription);
  assert.deepEqual(db.getSubscription('dark-mode', 'org-1'), subscription);
});

test('getSubscription returns null when no match for org', () => {
  assert.equal(db.getSubscription('dark-mode', 'org-2'), null);
});

after(() => {
  fs.unlinkSync(tmpFile);
});
