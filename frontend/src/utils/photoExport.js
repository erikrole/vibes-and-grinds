// Visit photos are shown at roughly a 672px-wide detail panel (about 1400px
// on a 2x screen) and an 80px journal thumb. Encoding the camera original
// wastes the upload, the later decode, and the battery it takes to do both.

export const VISIT_PHOTO_MAX_EDGE = 1600;
export const VISIT_PHOTO_JPEG_QUALITY = 0.82;

export function fittedPhotoSize(width, height, maxEdge = VISIT_PHOTO_MAX_EDGE) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const longest = Math.max(w, h);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scaled: scale < 1,
  };
}

export function revokeObjectUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

/**
 * Shrink a picked photo before the cropper decodes it. A failure (HEIC the
 * browser cannot read, or no canvas) returns the original file so the cropper
 * can try the same bytes it used to receive.
 */
export async function prepareVisitPhoto(file, maxEdge = VISIT_PHOTO_MAX_EDGE, quality = 0.92) {
  if (!file || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const fitted = fittedPhotoSize(bitmap.width, bitmap.height, maxEdge);
  if (!fitted?.scaled) {
    bitmap.close?.();
    return file;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = fitted.width;
    canvas.height = fitted.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, fitted.width, fitted.height);
    const blob = await new Promise((resolve) => {
      if (typeof canvas.toBlob !== 'function') resolve(null);
      else canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) return file;
    return new File([blob], 'visit-photo.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
