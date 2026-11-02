export const PHOTO_CDN_ORIGIN = 'https://images.erikrole.com';
export const PHOTO_R2_ORIGIN = 'https://pub-13a44e864c1c45628d4ebea21c8ac6d3.r2.dev';
export const PHOTO_VARIANT_SIZES = [160, 320, 1600];
export const PHOTO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function photoVariantKey(originalKey, size) {
  if (!PHOTO_VARIANT_SIZES.includes(size) || !originalKey || originalKey.startsWith('/')
    || originalKey.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Invalid photo variant.');
  }
  return `variants/v1/${size}/${originalKey}.webp`;
}

/** Only rewrite this journal's managed photos; arbitrary external URLs stay unchanged. */
export function photoVariantUrl(original, size = 1600) {
  try {
    if (typeof original === 'string' && original.startsWith('/api/photos/') && !/[?#]/.test(original)) {
      const key = decodeURIComponent(original.slice('/api/photos/'.length));
      if (key.startsWith('variants/')) return original;
      return `/api/photos/${photoVariantKey(key, size).split('/').map(encodeURIComponent).join('/')}`;
    }
    const url = new URL(original);
    if (![PHOTO_R2_ORIGIN, PHOTO_CDN_ORIGIN].includes(url.origin) || url.search || url.hash || url.username || url.password) return original;
    const key = decodeURIComponent(url.pathname.slice(1));
    if (key.startsWith('variants/')) return original;
    return `${PHOTO_CDN_ORIGIN}/${photoVariantKey(key, size).split('/').map(encodeURIComponent).join('/')}`;
  } catch { return original; }
}

/** Square card crops match object-cover; detail images retain their full aspect ratio. */
export function photoVariantLayout(width, height, size) {
  if (!PHOTO_VARIANT_SIZES.includes(size) || !Number.isFinite(width) || !Number.isFinite(height)
    || width <= 0 || height <= 0) throw new Error('Invalid photo dimensions.');
  if (size < 1600) {
    const edge = Math.min(width, height);
    const output = Math.min(size, edge);
    return { sx: (width - edge) / 2, sy: (height - edge) / 2, sw: edge, sh: edge, width: output, height: output };
  }
  const scale = Math.min(1, size / Math.max(width, height));
  return { sx: 0, sy: 0, sw: width, sh: height, width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
