import { PHOTO_VARIANT_SIZES, photoVariantLayout } from '../../../shared/photos.mjs';

async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* Older decoders use Image below. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

/** Originals remain available for recropping and recovery. Variants are optional. */
export async function createPhotoUpload(file) {
  const form = new FormData();
  form.append('file', file);
  let image;
  try {
    image = await decodePhoto(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width * height > 40_000_000) return form;
    const canvas = document.createElement('canvas');
    for (const size of PHOTO_VARIANT_SIZES) {
      const layout = photoVariantLayout(width, height, size);
      canvas.width = layout.width;
      canvas.height = layout.height;
      canvas.getContext('2d').drawImage(image, layout.sx, layout.sy, layout.sw, layout.sh, 0, 0, layout.width, layout.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
      const maximum = size === 1600 ? 2 * 1024 * 1024 : 256 * 1024;
      if (blob?.type === 'image/webp' && blob.size > 0 && blob.size <= maximum) form.append(`variant${size}`, blob, `${size}.webp`);
    }
    canvas.width = canvas.height = 1;
  } catch { /* A failed optional encoder must not lose the selected photo. */ }
  finally { image?.close?.(); }
  return form;
}
