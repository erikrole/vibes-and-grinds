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
