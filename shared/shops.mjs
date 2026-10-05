import { hash } from './auth.mjs';
export const normalize = (value = '') => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const street = (value) => normalize(value).replace(/\b(street|avenue|road|drive|boulevard|suite)\b/g,
  (word) => ({ street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', boulevard: 'blvd', suite: 'ste' })[word]);

export function sameLocation(a, b) {
  if (!normalize(a.coffee_shop_name) || normalize(a.coffee_shop_name) !== normalize(b.name || b.coffee_shop_name)) return false;
  const addressA = street(a.coffee_shop_address);
  const addressB = street(b.address || b.coffee_shop_address);
  const latA = a.coffee_shop_lat, lngA = a.coffee_shop_lng;
  const latB = b.lat ?? b.coffee_shop_lat, lngB = b.lng ?? b.coffee_shop_lng;
  const hasCoordinates = ![latA, lngA, latB, lngB].some((n) => n === '' || n == null || !Number.isFinite(Number(n)));
  if (hasCoordinates) {
    if (Math.abs(Number(latA)) > 90 || Math.abs(Number(latB)) > 90 || Math.abs(Number(lngA)) > 180 || Math.abs(Number(lngB)) > 180) return false;
    const north = (Number(latA) - Number(latB)) * 111320;
    const east = (Number(lngA) - Number(lngB)) * 111320 * Math.cos(Number(latA) * Math.PI / 180);
    return Math.hypot(north, east) <= 40;
  }
  const cityA = normalize(a.city), cityB = normalize(b.city);
  return Boolean(addressA && addressB && addressA === addressB && cityA && cityA === cityB);
}

export function shopKey(visit = {}) {
  if (visit.shop_id) return `shop:${visit.shop_id}`;
  if (visit.coffee_shop_place_id) return `place:${visit.coffee_shop_place_id}`;
  if (visit.coffee_shop_address) return `address:${normalize(visit.coffee_shop_name)}|${street(visit.coffee_shop_address)}|${normalize(visit.city)}`;
  // Unresolved manual entries remain separate until explicitly selected/repaired.
  return `manual:${visit.id || normalize(visit.coffee_shop_name) + '|' + normalize(visit.city)}`;
}

export async function resolveShop(DB, visit, { preserveId = null } = {}) {
  const place = visit.coffee_shop_place_id?.trim();
  if (place) {
    const alias = await DB.prepare('SELECT shop_id FROM coffee_shop_aliases WHERE provider_id = ?').bind(place).first();
    if (alias) return alias.shop_id;
  }
  const { results: shops } = await DB.prepare('SELECT * FROM coffee_shops').all();
  // A saved selection carries a stable ID, but location edits must clear it.
  const selected = shops.find((shop) => shop.id === visit.shop_id);
  const matches = shops.filter((shop) => sameLocation(visit, shop));
  let id = selected?.id || (matches.length === 1 ? matches[0].id : null);
  if (!id && preserveId && shops.some((shop) => shop.id === preserveId)) id = preserveId;
  if (!id) {
    // Deterministic exact-location/provider creation makes simultaneous saves
    // converge. Fuzzy matching above is conservative and never name-only.
    const identity = visit.coffee_shop_address && visit.city
      ? `address:${normalize(visit.coffee_shop_name)}|${street(visit.coffee_shop_address)}|${normalize(visit.city)}`
      : place ? `provider:${place}` : null;
    id = identity ? (await hash(identity)).slice(0, 32) : crypto.randomUUID();
    await DB.prepare('INSERT OR IGNORE INTO coffee_shops (id, name, city, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, visit.coffee_shop_name.trim(), visit.city || null, visit.coffee_shop_address || null,
        visit.coffee_shop_lat === '' ? null : visit.coffee_shop_lat ?? null,
        visit.coffee_shop_lng === '' ? null : visit.coffee_shop_lng ?? null).run();
    const created = await DB.prepare('SELECT * FROM coffee_shops WHERE id = ?').bind(id).first();
    if (identity && !sameLocation(visit, created) && visit.coffee_shop_lat != null && visit.coffee_shop_lat !== '') {
      // A reused street address must not override contradictory coordinates.
      id = (await hash(`${identity}|${Number(visit.coffee_shop_lat).toFixed(5)}|${Number(visit.coffee_shop_lng).toFixed(5)}`)).slice(0, 32);
      await DB.prepare('INSERT OR IGNORE INTO coffee_shops (id, name, city, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, visit.coffee_shop_name.trim(), visit.city || null, visit.coffee_shop_address || null,
          visit.coffee_shop_lat, visit.coffee_shop_lng).run();
    }
  }
  if (place) {
    await DB.prepare('INSERT OR IGNORE INTO coffee_shop_aliases (provider_id, shop_id) VALUES (?, ?)').bind(place, id).run();
    const canonical = await DB.prepare('SELECT shop_id FROM coffee_shop_aliases WHERE provider_id = ?').bind(place).first();
    id = canonical.shop_id;
  }
  return id;
}

export async function backfillShops(DB) {
  const { results } = await DB.prepare('SELECT * FROM coffee_visits WHERE shop_id IS NULL ORDER BY id').all();
  for (const visit of results) {
    const id = await resolveShop(DB, visit);
    await DB.prepare('UPDATE coffee_visits SET shop_id = ? WHERE id = ? AND shop_id IS NULL').bind(id, visit.id).run();
  }
}
