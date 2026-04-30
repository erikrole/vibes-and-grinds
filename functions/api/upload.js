// POST /api/upload - Upload a photo to R2

import { json, jsonError } from '../../shared/http.js';

export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return jsonError('No file provided', 400);
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;

    await env.PHOTOS.put(filename, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const url = `${env.R2_PUBLIC_URL}/${filename}`;
    return json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return jsonError('Failed to upload file');
  }
}
