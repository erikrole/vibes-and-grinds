import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { sqliteAdapter } from '../../shared/sqlite-adapter.mjs';
import { ownerSession, authorizeWrite, hash, isOwner } from '../../shared/auth.mjs';
import { resolveShop, sameLocation } from '../../shared/shops.mjs';
import { visitRoute, ownerDataRoute } from '../../shared/visits.mjs';
import { vestRoute } from '../../shared/vest.mjs';
const require = createRequire(import.meta.url);
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const key = 'isolated-test-key';
const origin = 'https://coffee.example.test';
const req = (path, method = 'GET', body, cookie = '', requestOrigin = origin) => new Request(origin + path, {
  method, headers: { Origin: requestOrigin, Cookie: cookie, 'Content-Type': 'application/json' }, body: body == null ? undefined : JSON.stringify(body),
});
async function fixture() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(await readFile(new URL('../../schema.sql', import.meta.url), 'utf8'));
  return { db, DB: sqliteAdapter(db), OWNER_KEY_HASH: await hash(key) };
}
async function login(env) {
  const response = await ownerSession(req('/api/owner/session', 'POST', { key }), env);
  assert.equal(response.status, 200);
  return response.headers.get('Set-Cookie').split(';')[0];
}
const visit = { date: '2026-10-04', coffee_shop_name: 'Main Street Coffee', city: 'Madison, WI', coffee_shop_address: '123 Main Street', coffee_shop_place_id: 'google:one', coffee_shop_lat: 43.07, coffee_shop_lng: -89.4, vibe_rating: 0, coffee_rating: 8.6, visit_type: 'road' };

test('owner sessions fail closed, enforce origin, reject forged cookies and expire on logout', async () => {
  const env = await fixture();
  try {
    assert.equal((await authorizeWrite(req('/api/visits', 'POST', visit), env)).status, 401);
    assert.equal((await ownerSession(req('/api/owner/session', 'POST', { key }, '', 'https://evil.test'), env)).status, 403);
    assert.equal((await ownerSession(req('/api/owner/session', 'POST', { key: 'wrong' }), env)).status, 401);
    const response = await ownerSession(req('/api/owner/session', 'POST', { key }), env);
    assert.match(response.headers.get('Set-Cookie'), /__Host-vg_owner=.*HttpOnly; SameSite=Strict; Max-Age=43200; Secure/);
    const cookie = response.headers.get('Set-Cookie').split(';')[0];
    assert.equal(await authorizeWrite(req('/api/upload', 'POST', {}, cookie), env), null);
    assert.equal((await authorizeWrite(req('/api/upload', 'POST', {}, cookie, 'https://evil.test'), env)).status, 403);
    assert.equal(await isOwner(req('/api/owner/session', 'GET', null, '__Host-vg_owner=' + 'f'.repeat(64)), env), false);
    assert.equal(await isOwner(req('/api/owner/session', 'GET', null, cookie), { ...env, OWNER_KEY_HASH: await hash('rotated-key') }), false);
    await ownerSession(req('/api/owner/session', 'DELETE', null, cookie), env);
    assert.equal(await isOwner(req('/api/owner/session', 'GET', null, cookie), env), false);
    assert.equal(await isOwner(req('/api/owner/session', 'GET', null, cookie), { ...env, OWNER_KEY_HASH: '' }), false);
  } finally { await env.db.close(); }
});

test('sign-in throttling is persistent and concurrent batches remain valid', async () => {
  const env = await fixture();
  try {
    for (let n = 0; n < 8; n++) assert.equal((await ownerSession(req('/api/owner/session', 'POST', { key: 'wrong' }), env)).status, 401);
    assert.equal((await ownerSession(req('/api/owner/session', 'POST', { key }), env)).status, 429);
    await env.db.run('DELETE FROM owner_login_attempts');
    const responses = await Promise.all([ownerSession(req('/api/owner/session', 'POST', { key }), env), ownerSession(req('/api/owner/session', 'POST', { key }), env)]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  } finally { await env.db.close(); }
});

test('provider aliases converge, concurrent saves share identity, and branches stay separate', async () => {
  const env = await fixture();
  try {
    const ids = await Promise.all([resolveShop(env.DB, visit), resolveShop(env.DB, visit)]);
    assert.equal(ids[0], ids[1]);
    const apple = await resolveShop(env.DB, { ...visit, coffee_shop_place_id: 'apple:new', coffee_shop_address: '123 Main St' });
    assert.equal(apple, ids[0]);
    const branch = { ...visit, coffee_shop_place_id: 'apple:other', city: 'Chicago, IL', coffee_shop_lat: 41.88, coffee_shop_lng: -87.63 };
    assert.equal(sameLocation(branch, visit), false);
    assert.notEqual(await resolveShop(env.DB, branch), apple);
    assert.notEqual(await resolveShop(env.DB, { ...branch, city: visit.city, coffee_shop_place_id: 'apple:conflict' }), apple);
    const manual = { ...visit, coffee_shop_address: null, coffee_shop_lat: null, coffee_shop_lng: null, coffee_shop_place_id: null };
    assert.notEqual(await resolveShop(env.DB, manual), apple);
  } finally { await env.db.close(); }
});

test('create, edit, soft delete, restore and export preserve IDs and original records', async () => {
  const env = await fixture();
  try {
    const cookie = await login(env);
    assert.equal((await visitRoute(req('/api/visits', 'POST', { ...visit, date: '2026-02-31' }), env.DB)).status, 400);
    const created = await (await visitRoute(req('/api/visits', 'POST', visit), env.DB)).json();
    assert.equal(created.vibe_rating, 0); assert.equal(created.coffee_rating, 8.6);
    assert.ok(created.shop_id);
    const edited = await (await visitRoute(req('/api/visits/' + created.id, 'PUT', { ...created, notes: 'Saved note' }), env.DB, created.id)).json();
    assert.equal(edited.shop_id, created.shop_id);
    assert.equal((await visitRoute(req('/api/visits/' + created.id, 'DELETE'), env.DB, created.id)).status, 204);
    assert.equal((await visitRoute(req('/api/visits/' + created.id), env.DB, created.id)).status, 404);
    assert.equal((await ownerDataRoute(req('/api/owner/trash'), env)).status, 401);
    const trash = await (await ownerDataRoute(req('/api/owner/trash', 'GET', null, cookie), env)).json();
    assert.equal(trash[0].notes, 'Saved note');
    const restored = await (await ownerDataRoute(req('/api/owner/trash/' + created.id, 'POST', {}, cookie), env, created.id)).json();
    assert.equal(restored.id, created.id); assert.equal(restored.shop_id, created.shop_id);
    const snapshot = await (await ownerDataRoute(req('/api/owner/export', 'GET', null, cookie), env)).json();
    assert.equal(snapshot.coffee_visits.length, 1); assert.equal(snapshot.owner_sessions, undefined);
  } finally { await env.db.close(); }
});

test('Vest saves validate all rows, reject stale revisions, preserve metadata and allow recovery', async () => {
  const env = await fixture();
  try {
    const cookie = await login(env);
    const game = { id: 1, opponent: 'Opponent', date: '2026-03-01', location: 'vs', outfit: 'Red Vest', result: 'W', espn_event_id: '123' };
    assert.equal((await vestRoute(req('/api/vest/games', 'PUT', { games: [game], revision: 0 }), env.DB)).status, 200);
    assert.equal((await vestRoute(req('/api/vest/games', 'PUT', { games: [{}], revision: 1 }), env.DB)).status, 400);
    assert.equal((await vestRoute(req('/api/vest/games', 'PUT', { games: [], revision: 0 }), env.DB)).status, 409);
    const responses = await Promise.all([vestRoute(req('/api/vest/games', 'PUT', { games: [{ ...game, outfit: 'Gray' }], revision: 1 }), env.DB), vestRoute(req('/api/vest/games', 'PUT', { games: [], revision: 1 }), env.DB)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    const current = await (await vestRoute(req('/api/vest/games'), env.DB)).json();
    assert.equal(current.revision, 2);
    const history = await (await ownerDataRoute(req('/api/owner/vest-history', 'GET', null, cookie), env)).json();
    assert.equal(history[0].game_count, 1);
    assert.equal((await ownerDataRoute(req('/api/owner/vest-history/' + history[0].id, 'POST', {}, cookie), env, history[0].id)).status, 200);
    const restored = await (await vestRoute(req('/api/vest/games'), env.DB)).json();
    assert.equal(restored.games[0].espn_event_id, '123'); assert.equal(restored.games[0].outfit, 'Red Vest');
  } finally { await env.db.close(); }
});
