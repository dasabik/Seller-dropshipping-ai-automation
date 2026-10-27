'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend/index.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function inlineScripts(source) {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(script => script.trim());
}

test('package has expected Node engine and runnable scripts', () => {
  assert.match(pkg.engines.node, />=20/);
  assert.equal(pkg.scripts.start, 'node backend/server.js');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js');
});

test('backend and all inline browser scripts parse', () => {
  new vm.Script(server, { filename: 'backend/server.js' });
  const scripts = inlineScripts(html);
  assert.ok(scripts.length >= 2, 'expected inline configuration and application scripts');
  scripts.forEach((script, i) => new vm.Script(script, { filename: `frontend-inline-${i}.js` }));
});

test('frontend API base is defined for same-origin Express hosting', () => {
  assert.match(html, /const API_BASE = '';/);
  assert.match(html, /fetch\(`\$\{API_BASE\}\$\{url\}`/);
});

test('important page areas and AI endpoints are present', () => {
  for (const text of [
    'view-welcome', 'view-auth', 'page-dashboard', 'page-connect', 'page-suppliers',
    'page-video', 'page-ai-assistant', 'page-orders', 'page-calculator', 'page-profile',
    'AI Assistant + Image Lab', 'aiSendChat', 'aiGenerateImage', 'channelSync'
  ]) assert.ok(html.includes(text), `missing UI feature: ${text}`);
  for (const route of [
    "app.get('/api/health'", "app.post('/api/auth/register'", "app.post('/api/auth/login'",
    "app.get('/api/orders'", "app.get('/api/catalog'", "app.get('/api/ai/status'",
    "app.post('/api/ai/chat'", "app.post('/api/ai/image'"
  ]) assert.ok(server.includes(route), `missing backend route: ${route}`);
});

test('HTML IDs are unique and inline click handlers have corresponding functions', () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate HTML IDs found');
  const functions = new Set([
    ...html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g),
    ...html.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)
  ].map(m => m[1]));
  const missing = [];
  for (const match of html.matchAll(/\bonclick=["']([^"']+)["']/g)) {
    const expression = match[1].trim();
    const call = expression.match(/^([A-Za-z_$][\w$]*)\s*\(/);
    if (call && !functions.has(call[1]) && !['alert','confirm','print'].includes(call[1])) missing.push(call[1]);
  }
  assert.deepEqual([...new Set(missing)], [], 'inline click handler refers to an undefined function');
});

test('no seeded seller identity or fabricated supplier catalog', () => {
  assert.match(html, /const PRE_CONNECTED_WHOLESALE_CATALOG = \[\];/);
  assert.match(html, /name:\s*""/);
  assert.doesNotMatch(html, /DEMO-DRAFT-|seller_dropshipping_ai_demo_v1/);
  assert.match(html, /seller_dropshipping_local_sellers_v2/);
  assert.match(html, /function isStandalonePreview\(\)/);
  assert.match(html, /password was not verified by a server/);
});

test('carrier and marketplace integrations never claim success without a provider adapter', () => {
  assert.match(server, /PROVIDER_ADAPTER_REQUIRED/);
  assert.match(server, /no estimated delivery or status will be fabricated/i);
  assert.match(html, /AWB: Not generated — connect an approved carrier API/);
  assert.match(html, /connection flow is not implemented yet; no API request was sent/i);
});

test('AI credentials are server-side and AI endpoints require authentication', () => {
  assert.match(server, /app\.post\('\/api\/ai\/chat', auth,/);
  assert.match(server, /app\.post\('\/api\/ai\/image', auth,/);
  assert.match(server, /process\.env\.AI_API_KEY/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9]{20,}/);
  assert.match(html, /\/api\/ai\/chat/);
  assert.match(html, /\/api\/ai\/image/);
});


test('login failure explains backend, database and legacy offline-account problems', () => {
  assert.match(html, /Cannot reach the backend/);
  assert.match(html, /older offline preview/);
  assert.match(html, /auth-status/);
  assert.match(server, /DATABASE_NOT_READY/);
  assert.match(server, /setInterval\(attemptDatabaseInit,15000\)/);
});

test('startup splash transitions to the existing welcome page and can be skipped', () => {
  assert.match(html, /id="startup-splash"/);
  assert.match(html, /SELLER<br>DROP SHIPPING<br><span>AI<\/span>/);
  assert.match(html, /function skipStartupSplash\(\)/);
  assert.match(html, /setTimeout\(skipStartupSplash, 1750\)/);
  assert.match(html, /id="view-welcome"[^>]*style="display:none;background:/);
});

test('offline dashboard preview is clearly labelled and exits back to welcome', () => {
  assert.match(html, /Preview Dashboard \(offline · no account\)/);
  assert.match(html, /OFFLINE PREVIEW/);
  assert.match(html, /function exitDashboardPreview\(\)/);
  assert.match(html, /Open AI Chat & Image Studio/);
  assert.match(html, /function openAIStudioPreview\(\)/);
});


test('Google Gemini adapter and marketing endpoint are wired safely', () => {
  const service = fs.readFileSync(path.join(root, 'backend/services/aiStudioService.js'), 'utf8');
  assert.match(server, /require\('.\/services\/aiStudioService'\)/);
  assert.ok(server.includes("app.post('/api/ai/generate-marketing', auth"));
  new vm.Script(service, { filename: 'backend/services/aiStudioService.js' });
  assert.match(service, /x-goog-api-key/);
  assert.match(service, /generateContent/);
  assert.match(service, /responseModalities:\['TEXT','IMAGE'\]/);
  assert.match(envExample, /GEMINI_API_KEY=/);
  assert.match(envExample, /GEMINI_IMAGE_MODEL=/);
  assert.doesNotMatch(html, /AIzaSy[A-Za-z0-9_-]{20,}/);
});
