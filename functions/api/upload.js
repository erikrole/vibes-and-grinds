// POST /api/upload - Upload a photo to R2
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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
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
      JSON.stringify({
        error: 'Failed to upload file',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
