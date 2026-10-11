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

/** Header the client must send on POST/PUT/PATCH/DELETE. */
export const WRITE_KEY_HEADER = 'X-Write-Key';

/**
 * Shared write-gate for mutating API requests.
 *
 * - If WRITE_KEY is set: require a matching X-Write-Key header.
 * - If WRITE_KEY is unset: allow only when ALLOW_INSECURE_WRITES=true (local/dev).
 *   Production should always set WRITE_KEY so anonymous writes are rejected.
 */
export function isWriteAuthorized(request, env = {}) {
  const expected = `${env.WRITE_KEY || ''}`.trim();
  const insecureOk =
    env.ALLOW_INSECURE_WRITES === true ||
    `${env.ALLOW_INSECURE_WRITES || ''}`.toLowerCase() === 'true';

  if (!expected) return insecureOk;

  const provided = `${request.headers.get(WRITE_KEY_HEADER) || ''}`.trim();
  return provided.length > 0 && provided === expected;
}

export function unauthorizedWriteResponse(env = {}) {
  const expected = `${env.WRITE_KEY || ''}`.trim();
  if (!expected) {
    return jsonResponse(
      {
        error:
          'Write protection is not configured. Set the WRITE_KEY secret on the server (or ALLOW_INSECURE_WRITES=true for local only).',
      },
      503
    );
  }

  return jsonResponse(
    { error: 'Unauthorized. Provide a valid X-Write-Key header.' },
    401
  );
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
