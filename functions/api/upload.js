import { PHOTO_CACHE_CONTROL, PHOTO_VARIANT_SIZES, photoVariantKey } from '../../shared/photos.mjs';

// POST /api/upload - Upload a photo and optional browser-encoded variants to R2.
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return new Response(JSON.stringify({ error: 'Photo must be a JPG, PNG, WebP, or HEIC image' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return new Response(JSON.stringify({ error: 'Photo must be 12 MB or smaller' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const variants = [];
    for (const size of PHOTO_VARIANT_SIZES) {
      const variant = formData.get(`variant${size}`);
      if (!variant) continue;
      const maximum = size === 1600 ? 2 * 1024 * 1024 : 256 * 1024;
      if (variant.type !== 'image/webp' || typeof variant.stream !== 'function' || variant.size <= 0 || variant.size > maximum) {
        return new Response(JSON.stringify({ error: 'Could not use the resized photo. Please choose the photo again.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      variants.push({ size, file: variant });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomUUID();
    const extension = getSafeExtension(file);
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Upload to R2
    await env.PHOTOS.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: PHOTO_CACHE_CONTROL,
      },
    });

    // The original is the recovery path if an optional variant could not be stored.
    await Promise.allSettled(variants.map(({ size, file: variant }) => env.PHOTOS.put(photoVariantKey(filename, size), variant.stream(), {
      httpMetadata: { contentType: 'image/webp', cacheControl: PHOTO_CACHE_CONTROL },
    })));

    // Return public URL
    const url = `${env.R2_PUBLIC_URL}/${filename}`;

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function getSafeExtension(file) {
  const byType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };

  return byType[file.type] || 'jpg';
}
