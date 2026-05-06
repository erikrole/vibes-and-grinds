/**
 * Rating color ramp — earthy traffic light. Red → yellow → green semantics
 * preserved, but each stop is muted/desaturated to live inside the warm
 * coffee-shop palette instead of clashing with it.
 *
 * Stops are spaced so the visible differentiation lands in the 6.5–10 range
 * where real ratings live (13+/20 composite). Sub-6 collapses through the
 * red→amber transition, which is fine: the eye only needs "low" there.
 *
 *   0    → terracotta     rgb(178,  88,  68)   warm brick, not fire-engine
 *   4    → clay rust      rgb(196, 130,  90)
 *   6    → honey amber    rgb(212, 165,  85)
 *   7    → olive amber    rgb(186, 174,  92)
 *   8    → sage           rgb(146, 168,  98)   muted natural green
 *   9    → moss           rgb(110, 148,  88)
 *  10    → forest         rgb( 88, 132,  78)
 */

const STOPS = [
  { v: 0,   rgb: [178,  88,  68] },
  { v: 4,   rgb: [196, 130,  90] },
  { v: 6,   rgb: [212, 165,  85] },
  { v: 7,   rgb: [186, 174,  92] },
  { v: 8,   rgb: [146, 168,  98] },
  { v: 9,   rgb: [110, 148,  88] },
  { v: 10,  rgb: [ 88, 132,  78] },
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

export function getRatingColor(rating) {
  const r = Math.max(0, Math.min(10, Number(rating) || 0));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1];
    if (r <= b.v) {
      const t = (r - a.v) / (b.v - a.v);
      return `rgb(${lerp(a.rgb[0], b.rgb[0], t)}, ${lerp(a.rgb[1], b.rgb[1], t)}, ${lerp(a.rgb[2], b.rgb[2], t)})`;
    }
  }
  const last = STOPS[STOPS.length - 1].rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

export function getCompositeColor(composite) {
  return getRatingColor((Number(composite) || 0) / 2);
}
