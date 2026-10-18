import { describe, expect, it } from 'vitest';
import { freshPayload } from '../../../functions/api/vest/_freshCache.js';

describe('freshPayload', () => {
  const now = Date.parse('2026-03-06T18:00:00Z');

  it('reuses a payload inside the ttl and drops it once the ttl passes', () => {
    const entry = { storedAt: now - 30_000, payload: { games: [{ id: 1 }] } };

    expect(freshPayload(entry, now, 120_000)).toEqual({ games: [{ id: 1 }] });
    expect(freshPayload(entry, now, 30_000)).toBeNull();
    expect(freshPayload(entry, now + 30_000, 30_000)).toBeNull();
  });

  it('rejects a missing entry', () => {
    expect(freshPayload(null, now, 120_000)).toBeNull();
    expect(freshPayload({ storedAt: now, payload: null }, now, 120_000)).toBeNull();
    expect(freshPayload({ payload: { ok: true } }, now, 120_000)).toBeNull();
  });
});
