function cssVar(name: string, fallback: number): number {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val ? Number(val) : fallback;
}

/**
 * Red (0) -> Yellow (5) -> Green (10), driven by CSS custom properties for theming.
 */
export function getRatingColor(rating: number): string {
  const clampedRating = Math.max(0, Math.min(10, rating));

  const lowR = cssVar('--rating-low-r', 220);
  const lowG = cssVar('--rating-low-g', 38);
  const lowB = cssVar('--rating-low-b', 38);
  const midR = cssVar('--rating-mid-r', 220);
  const midG = cssVar('--rating-mid-g', 184);
  const midB = cssVar('--rating-mid-b', 38);
  const highR = cssVar('--rating-high-r', 34);
  const highG = cssVar('--rating-high-g', 197);
  const highB = cssVar('--rating-high-b', 94);

  if (clampedRating <= 5) {
    const pct = clampedRating / 5;
    const r = Math.round(lowR + (midR - lowR) * pct);
    const g = Math.round(lowG + (midG - lowG) * pct);
    const b = Math.round(lowB + (midB - lowB) * pct);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const pct = (clampedRating - 5) / 5;
    const r = Math.round(midR + (highR - midR) * pct);
    const g = Math.round(midG + (highG - midG) * pct);
    const b = Math.round(midB + (highB - midB) * pct);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function getCompositeColor(composite: number): string {
  return getRatingColor(composite / 2);
}

export function getTextColor(bgColor: string): '#000000' | '#ffffff' {
  const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#000000';

  const [, r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
