// Shared freshness check for in-memory and session caches.
// A read that already has a recent payload should not fetch again.

export function freshPayload(entry, now, ttlMs) {
  if (!entry || entry.storedAt == null || entry.payload == null) return null;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return null;
  if (!Number.isFinite(now) || now < entry.storedAt) return null;
  if (now - entry.storedAt >= ttlMs) return null;
  return entry.payload;
}
