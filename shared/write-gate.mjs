/** Header the client must send on POST/PUT/PATCH/DELETE. */
export const WRITE_KEY_HEADER = 'X-Write-Key';

const MIN_WRITE_KEY_LENGTH = 16;

// Example and well-known strings are public. Treat them as "not configured"
// so copying .env.example cannot unlock writes.
const WEAK_WRITE_KEYS = new Set([
  'change-me-to-a-long-random-secret',
  'changeme',
  'password',
  'secret',
  'write-key',
  'writekey',
]);

export const WRITE_NOT_CONFIGURED_ERROR =
  'Write protection is not configured. Set a long random WRITE_KEY secret (at least 16 characters; never an example placeholder), or ALLOW_INSECURE_WRITES=true for local only.';

export const WRITE_UNAUTHORIZED_ERROR =
  'Unauthorized. Provide a valid X-Write-Key header.';

/**
 * Constant-time string compare. Length is mixed into the accumulator so a
 * mismatch still walks the longer input.
 */
export function secretsEqual(a, b) {
  const left = `${a}`;
  const right = `${b}`;
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Return a usable secret, or '' when missing, short, or a known placeholder. */
export function acceptedWriteKey(value) {
  const trimmed = `${value || ''}`.trim();
  if (trimmed.length < MIN_WRITE_KEY_LENGTH) return '';
  if (WEAK_WRITE_KEYS.has(trimmed.toLowerCase())) return '';
  return trimmed;
}

function insecureWritesAllowed(allowInsecure) {
  return allowInsecure === true || `${allowInsecure || ''}`.toLowerCase() === 'true';
}

/**
 * Decide whether a mutating request may proceed.
 *
 * - Usable WRITE_KEY → require a matching provided key (ALLOW_INSECURE_WRITES ignored).
 * - Missing/weak WRITE_KEY → allow only when ALLOW_INSECURE_WRITES=true.
 */
export function authorizeWrite({ writeKey, allowInsecure, providedKey } = {}) {
  const expected = acceptedWriteKey(writeKey);
  if (!expected) {
    if (insecureWritesAllowed(allowInsecure)) return { ok: true };
    return { ok: false, status: 503, error: WRITE_NOT_CONFIGURED_ERROR };
  }

  const provided = `${providedKey || ''}`.trim();
  if (provided && secretsEqual(provided, expected)) return { ok: true };
  return { ok: false, status: 401, error: WRITE_UNAUTHORIZED_ERROR };
}
