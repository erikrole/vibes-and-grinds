// Shared helpers for the visits routes.
//
// Lives in an underscore-prefixed file so Cloudflare Pages does not turn it into
// a route. It also can't live in `visits.js`: importing that from
// `visits/[id].js` as `'../visits'` resolves to the `visits/` *directory*, not
// the file, which fails to resolve.

export function normalizeOptionalText(value) {
  return (value || '').trim() || null;
}

// Only 'home' (around Madison) and 'road' are valid; anything else falls back to 'road'.
export function normalizeVisitType(value) {
  return value === 'home' ? 'home' : 'road';
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

import { authorizeWrite, WRITE_KEY_HEADER as SHARED_WRITE_KEY_HEADER } from '../../shared/write-gate.mjs';

/** Header the client must send on POST/PUT/PATCH/DELETE. */
export const WRITE_KEY_HEADER = SHARED_WRITE_KEY_HEADER;

/**
 * Shared write-gate for mutating API requests.
 *
 * - Usable WRITE_KEY (16+ chars, not a placeholder): require a matching header.
 * - Missing or placeholder WRITE_KEY: allow only when ALLOW_INSECURE_WRITES=true.
 *   Production must set a real WRITE_KEY so anonymous writes are rejected.
 */
export function isWriteAuthorized(request, env = {}) {
  return authorizeWrite({
    writeKey: env.WRITE_KEY,
    allowInsecure: env.ALLOW_INSECURE_WRITES,
    providedKey: request?.headers?.get?.(WRITE_KEY_HEADER),
  }).ok;
}

export function unauthorizedWriteResponse(env = {}) {
  const decision = authorizeWrite({
    writeKey: env.WRITE_KEY,
    allowInsecure: false,
    providedKey: '',
  });
  return jsonResponse({ error: decision.error }, decision.status);
}

/**
 * Validate the required fields for a coffee visit.
 * Returns an error string if invalid, or null if valid.
 *
 * Ratings arrive as JSON and may be strings from a hand-rolled client. Coerce
 * before range-checking, otherwise "abc" passes `< 0 || > 10` (both false) and
 * only fails later against the column's CHECK constraint, as an opaque 500.
 */
export function validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating }) {
  if (!date || !String(date).trim()) return 'Date is required';
  if (!coffee_shop_name || !String(coffee_shop_name).trim()) return 'Coffee shop name is required';

  for (const [label, value] of [['Vibe', vibe_rating], ['Coffee', coffee_rating]]) {
    const num = Number(value);
    if (value === undefined || value === null || value === '' || !Number.isFinite(num)) {
      return `${label} rating is required`;
    }
    if (num < 0 || num > 10) return `${label} rating must be between 0 and 10`;
  }

  return null;
}
