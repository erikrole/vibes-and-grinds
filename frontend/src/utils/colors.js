/**
 * Get color for a rating on a 0-10 scale
 * Red (0) -> Yellow (5) -> Green (10)
 */
export function getRatingColor(rating) {
  // Clamp rating between 0 and 10
  const clampedRating = Math.max(0, Math.min(10, rating));

  if (clampedRating <= 5) {
    // Red to Yellow (0-5)
    const percentage = clampedRating / 5;
    const r = 239; // Red component (stays high)
    const g = Math.round(68 + (234 - 68) * percentage); // Green increases
    const b = 68; // Blue component (stays low)
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Green (5-10)
    const percentage = (clampedRating - 5) / 5;
    const r = Math.round(234 - (234 - 34) * percentage); // Red decreases
    const g = Math.round(179 + (197 - 179) * percentage); // Green stays high
    const b = Math.round(8 + (94 - 8) * percentage); // Blue increases
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
