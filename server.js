// Single-file HTTP server: serves the billing/feature API (PRD section 6) and static files from ./public.
// Auth is a stubbed fixed org per the PRD's non-functional requirements (no real auth in v0).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./data');

const PORT = process.env.PORT || 3000;
const STUB_ORG_ID = 'org-1';
const PUBLIC_DIR = path.join(__dirname, 'public');

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }
  fs.readFile(filePath, (err, content) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200);
    res.end(content);
  });
}

async function handleCreateFeature(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }
  const { featureId, displayName, price } = body;
  if (!featureId || !displayName || price === undefined) {
    return sendJson(res, 400, {
      error: 'featureId, displayName, and price are required',
    });
  }
  const feature = db.saveFeature({ featureId, displayName, price });
  sendJson(res, 201, feature);
}

function handleGetFeature(res, featureId) {
  const feature = db.getFeature(featureId);
  if (!feature) return sendJson(res, 404, { error: 'Feature not found' });
  sendJson(res, 200, feature);
}

function handleBillingState(res, featureId) {
  const feature = db.getFeature(featureId);
  if (!feature) return sendJson(res, 404, { error: 'Feature not found' });
  const subscription = db.getSubscription(featureId, STUB_ORG_ID);
  sendJson(res, 200, {
    feature,
    active: Boolean(subscription),
    subscription,
  });
}

function handleActivate(res, featureId) {
  const feature = db.getFeature(featureId);
  if (!feature) return sendJson(res, 404, { error: 'Feature not found' });
  const existing = db.getSubscription(featureId, STUB_ORG_ID);
  if (existing) return sendJson(res, 200, existing);
  const subscription = db.saveSubscription({
    subscriptionId: crypto.randomUUID(),
    featureId,
    orgId: STUB_ORG_ID,
    status: 'active',
    activatedAt: new Date().toISOString(),
  });
  sendJson(res, 201, subscription);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const parts = pathname.split('/').filter(Boolean);

  try {
    if (req.method === 'POST' && pathname === '/features') {
      return await handleCreateFeature(req, res);
    }
    if (req.method === 'GET' && parts[0] === 'features' && parts.length === 2) {
      return handleGetFeature(res, decodeURIComponent(parts[1]));
    }
    if (
      req.method === 'GET' &&
      parts[0] === 'billing' &&
      parts.length === 3 &&
      parts[2] === 'state'
    ) {
      return handleBillingState(res, decodeURIComponent(parts[1]));
    }
    if (
      req.method === 'POST' &&
      parts[0] === 'billing' &&
      parts.length === 3 &&
      parts[2] === 'activate'
    ) {
      return handleActivate(res, decodeURIComponent(parts[1]));
    }
    if (req.method === 'GET') {
      return serveStatic(res, pathname);
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = server;
