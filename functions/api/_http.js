// Request guards shared by the Pages functions and the local Express server.
// Bodies, seasons, and event ids are checked before any upstream or D1 call.

export const MAX_JSON_BYTES = 256 * 1024;
export const MAX_BLURB_CHARS = 4000;
export const MAX_PLACES_INPUT = 200;
export const MAX_PLACE_ID_LENGTH = 300;

export function bodyTooLarge(request, maxBytes = MAX_JSON_BYTES) {
  const header = request?.headers?.get?.('content-length');
  if (header == null || header === '') return false;
  const size = Number(header);
  return Number.isFinite(size) && size > maxBytes;
}

function byteLength(text) {
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(text);
  return new TextEncoder().encode(text).length;
}

/**
 * Read a JSON body with a hard size cap.
 * Returns { ok: true, value } or { ok: false, status, error }.
 * Invalid JSON is a 400. A body over the cap is a 413 and is not parsed further.
 */
export async function readJsonBody(request, maxBytes = MAX_JSON_BYTES) {
  if (bodyTooLarge(request, maxBytes)) {
    return { ok: false, status: 413, error: 'Request body is too large' };
  }

  let text = '';
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }

  if (byteLength(text) > maxBytes) {
    return { ok: false, status: 413, error: 'Request body is too large' };
  }
  if (!String(text).trim()) {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }
}

/** A 4-digit season, or the fallback when the query param is absent. Null when it is present but not a year. */
export function readSeason(value, fallback = '2025') {
  if (value == null || String(value).trim() === '') return fallback;
  const raw = String(value).trim();
  return /^\d{4}$/.test(raw) ? raw : null;
}

/** ESPN event ids are numeric. Anything else must not be interpolated into the summary URL. */
export function readEventId(value) {
  const raw = String(value ?? '').trim();
  return /^[0-9]{1,12}$/.test(raw) ? raw : null;
}

/**
 * Keep a real coordinate, including 0. Blank and non-numeric values become null
 * instead of the string "nope" or a dropped equator/prime-meridian point.
 */
export function optionalCoord(value) {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

export function readPlaceId(value) {
  const id = `${value ?? ''}`.trim();
  if (!id) return { error: 'placeId is required.', status: 400 };
  if (id.length > MAX_PLACE_ID_LENGTH || /[\s/?#\\]/.test(id)) {
    return { error: 'placeId is invalid.', status: 400 };
  }
  return { id };
}
