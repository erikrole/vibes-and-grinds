import { json, isOwner } from './auth.mjs';
import { resolveShop, backfillShops, sameLocation, normalize } from './shops.mjs';
import { vestRoute, mapGame } from './vest.mjs';

const fields = ['date', 'coffee_shop_name', 'city', 'opponent', 'sport', 'visit_type', 'coffee_shop_address',
  'coffee_shop_place_id', 'coffee_shop_lat', 'coffee_shop_lng', 'coffee_order', 'vibe_rating', 'coffee_rating', 'notes', 'photo_url'];

function cleanVisit(body) {
  const visit = Object.fromEntries(fields.map((field) => [field, body[field] ?? null]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.date || '') || !Number.isFinite(Date.parse(visit.date)) || new Date(visit.date).toISOString().slice(0, 10) !== visit.date) throw new Error('Choose a valid visit date.');
  if (typeof visit.coffee_shop_name !== 'string' || !visit.coffee_shop_name.trim()) throw new Error('Shop name is required.');
  for (const field of ['vibe_rating', 'coffee_rating']) {
    if (visit[field] == null || visit[field] === '' || !Number.isFinite(Number(visit[field])) || Number(visit[field]) < 0 || Number(visit[field]) > 10) throw new Error('Ratings must be between 0 and 10.');
    visit[field] = Number(visit[field]);
  }
  visit.visit_type = visit.visit_type === 'home' ? 'home' : 'road';
  for (const field of fields.filter((field) => !['vibe_rating', 'coffee_rating', 'coffee_shop_lat', 'coffee_shop_lng'].includes(field))) {
    if (visit[field] != null && typeof visit[field] !== 'string') throw new Error('Invalid visit details.');
    if (typeof visit[field] === 'string') visit[field] = visit[field].trim() || null;
  }
  for (const [field, limit] of [['coffee_shop_lat', 90], ['coffee_shop_lng', 180]]) {
    const value = visit[field];
    visit[field] = value === '' || value == null ? null : Number(value);
    if (visit[field] != null && (!Number.isFinite(visit[field]) || Math.abs(visit[field]) > limit)) throw new Error('Invalid location coordinates.');
  }
  if (visit.visit_type === 'home') { visit.sport = null; visit.opponent = null; }
  if (visit.photo_url && !/^https?:\/\//.test(visit.photo_url) && !visit.photo_url.startsWith('/api/photos/')) throw new Error('Invalid photo URL.');
  return visit;
}

export async function visitRoute(request, DB, id = null) {
  try {
    if (request.method === 'GET') {
      if (id) {
        const visit = await DB.prepare('SELECT * FROM coffee_visits WHERE id = ? AND deleted_at IS NULL').bind(id).first();
        return visit ? json(visit) : json({ error: 'Visit not found.' }, 404);
      }
      return json((await DB.prepare('SELECT * FROM coffee_visits WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC').all()).results);
    }
    if (request.method === 'DELETE' && id) {
      const result = await DB.prepare('UPDATE coffee_visits SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL').bind(id).run();
      return result.meta.changes ? new Response(null, { status: 204 }) : json({ error: 'Visit not found.' }, 404);
    }
    if (!['POST', 'PUT'].includes(request.method) || (request.method === 'PUT' && !id)) return json({ error: 'Method not allowed.' }, 405);
    let body;
    try { body = await request.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); } catch { return json({ error: 'Invalid visit details.' }, 400); }
    let visit;
    try { visit = cleanVisit(body); } catch (error) { return json({ error: error.message }, 400); }
    const existing = id ? await DB.prepare('SELECT * FROM coffee_visits WHERE id = ? AND deleted_at IS NULL').bind(id).first() : null;
    if (id && !existing) return json({ error: 'Visit not found.' }, 404);
    const sameShop = existing && ['coffee_shop_name', 'city', 'coffee_shop_address', 'coffee_shop_place_id', 'coffee_shop_lat', 'coffee_shop_lng'].every((field) => String(existing[field] ?? '') === String(visit[field] ?? ''));
    if (body.shop_id) {
      const shop = await DB.prepare('SELECT * FROM coffee_shops WHERE id = ?').bind(body.shop_id).first();
      const unchangedManual = shop && normalize(shop.name) === normalize(visit.coffee_shop_name) && normalize(shop.city) === normalize(visit.city)
        && !shop.address && shop.lat == null && !visit.coffee_shop_address && visit.coffee_shop_lat == null;
      if (shop && (sameLocation(visit, shop) || unchangedManual)) visit.shop_id = shop.id;
    }
    const shopId = await resolveShop(DB, visit, { preserveId: sameShop ? existing.shop_id : null });
    const values = fields.map((field) => visit[field]);
    if (id) {
      const result = await DB.prepare(`UPDATE coffee_visits SET ${fields.map((field) => `${field} = ?`).join(', ')}, shop_id = ? WHERE id = ? AND deleted_at IS NULL`).bind(...values, shopId, id).run();
      if (!result.meta.changes) return json({ error: 'This visit was deleted before your changes were saved.' }, 409);
    }
    else {
      const result = await DB.prepare(`INSERT INTO coffee_visits (${fields.join(', ')}, shop_id) VALUES (${[...fields, 'shop_id'].map(() => '?').join(', ')})`).bind(...values, shopId).run();
      id = result.meta.last_row_id;
    }
    const saved = await DB.prepare('SELECT * FROM coffee_visits WHERE id = ? AND deleted_at IS NULL').bind(id).first();
    return saved ? json(saved, existing ? 200 : 201) : json({ error: 'This visit is no longer available.' }, 409);
  } catch (error) {
    console.error('Visit request failed:', error.message);
    return json({ error: 'Could not save the visit. Please try again.' }, 500);
  }
}

export async function ownerDataRoute(request, env, id = null) {
  if (!(await isOwner(request, env))) return json({ error: 'Owner sign-in required.' }, 401);
  const path = new URL(request.url).pathname;
  if (path.endsWith('/backfill') && request.method === 'POST') { await backfillShops(env.DB); return json({ ok: true }); }
  if (path.endsWith('/export') && request.method === 'GET') {
    const snapshot = { version: 1, exported_at: new Date().toISOString() };
    for (const table of ['coffee_visits', 'coffee_shops', 'coffee_shop_aliases', 'vest_games', 'vest_snapshots', 'vest_state']) snapshot[table] = (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;
    return json(snapshot, 200, { 'Content-Disposition': `attachment; filename="vibes-and-grinds-${new Date().toISOString().slice(0, 10)}.json"` });
  }
  if (path.includes('/vest-history')) {
    if (request.method === 'GET') return json((await env.DB.prepare('SELECT id, created_at, json_array_length(games_json) AS game_count FROM vest_snapshots ORDER BY id DESC LIMIT 20').all()).results);
    if (request.method === 'POST' && id) {
      const snapshot = await env.DB.prepare('SELECT games_json FROM vest_snapshots WHERE id = ?').bind(id).first();
      if (!snapshot) return json({ error: 'Game snapshot not found.' }, 404);
      const { revision } = await env.DB.prepare('SELECT revision FROM vest_state WHERE id = 1').first();
      return vestRoute(new Request(request.url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, games: JSON.parse(snapshot.games_json).map(mapGame) }) }), env.DB);
    }
  }
  if (path.includes('/trash') && request.method === 'GET') return json((await env.DB.prepare('SELECT * FROM coffee_visits WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all()).results);
  if (id && request.method === 'POST') {
    const result = await env.DB.prepare('UPDATE coffee_visits SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL').bind(id).run();
    if (!result.meta.changes) return json({ error: 'Deleted visit not found.' }, 404);
    return json(await env.DB.prepare('SELECT * FROM coffee_visits WHERE id = ?').bind(id).first());
  }
  return json({ error: 'Method not allowed.' }, 405);
}
