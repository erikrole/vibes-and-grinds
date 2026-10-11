/**
 * Rating color bands — discrete semantic stops (not a continuous interpolate).
 * Values map to CSS variables --score-* defined in index.css so light/dark
 * and component chrome share one path.
 *
 *   < 5     → --score-low       terracotta
 *   < 6.5   → --score-low-mid   clay rust
 *   < 7.5   → --score-mid       honey amber
 *   < 8.5   → --score-good      sage
 *   < 9.5   → --score-high      moss
 *   ≥ 9.5   → --score-peak      forest
 */

export function getScoreBand(rating) {
  const r = Math.max(0, Math.min(10, Number(rating) || 0));
  if (r < 5) return 'low';
  if (r < 6.5) return 'low-mid';
  if (r < 7.5) return 'mid';
  if (r < 8.5) return 'good';
  if (r < 9.5) return 'high';
  return 'peak';
}

export function getRatingColor(rating) {
  return `var(--score-${getScoreBand(rating)})`;
}

export function getCompositeColor(composite) {
  return getRatingColor((Number(composite) || 0) / 2);
}
