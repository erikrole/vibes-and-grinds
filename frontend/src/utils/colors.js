/**
 * Get color for a rating on a 0-10 scale
 * Warm tones: Bronze (0) -> Gold (5) -> Deep Gold (10)
 * More sophisticated, classy color palette
 */
export function getRatingColor(rating) {
  // Clamp rating between 0 and 10
  const clampedRating = Math.max(0, Math.min(10, rating));

  if (clampedRating <= 5) {
    // Warm gray to bronze (0-5)
    const percentage = clampedRating / 5;
    const r = Math.round(120 + (184 - 120) * percentage);
    const g = Math.round(113 + (134 - 113) * percentage);
    const b = Math.round(99 + (91 - 99) * percentage);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Bronze to rich gold (5-10)
    const percentage = (clampedRating - 5) / 5;
    const r = Math.round(184 + (180 - 184) * percentage);
    const g = Math.round(134 + (134 - 134) * percentage);
    const b = Math.round(91 + (52 - 91) * percentage);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Get color for composite score (0-20 scale)
 * Since composite is sum of two ratings, max is 20
 */
export function getCompositeColor(composite) {
  // Normalize to 0-10 scale
  const normalized = composite / 2;
  return getRatingColor(normalized);
}

/**
 * Get text color (black or white) based on background color for readability
 */
export function getTextColor(bgColor) {
  // Parse RGB values
  const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#000000';

  const [, r, g, b] = match.map(Number);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
