// POST /api/upload - Upload a photo to R2
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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomUUID();
    const extension = getSafeExtension(file);
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Upload to R2
    await env.PHOTOS.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

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
