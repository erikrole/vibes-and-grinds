import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../../functions/api/upload.js';

function upload(parts) {
  const form = new FormData();
  for (const [name, blob] of Object.entries(parts)) form.append(name, blob, name === 'file' ? 'photo.jpg' : 'variant.webp');
  return new Request('https://coffee.test/api/upload', { method: 'POST', body: form });
}
const original = () => new Blob(['original'], { type: 'image/jpeg' });
const webp = () => new Blob(['webp'], { type: 'image/webp' });

test('stores original and optional variants under separate immutable keys', async () => {
  const written = [];
  const result = await onRequestPost({ request: upload({ file: original(), variant160: webp(), variant1600: webp() }), env: {
    R2_PUBLIC_URL: 'https://photos.test', PHOTOS: { put: async (key, body, options) => written.push({ key, bytes: await new Response(body).text(), options }) },
  } });
  assert.equal(result.status, 200);
  const key = (await result.json()).url.split('/').at(-1);
  assert.deepEqual(written.map((x) => x.key).sort(), [key, `variants/v1/160/${key}.webp`, `variants/v1/1600/${key}.webp`].sort());
  assert.equal(written.find((x) => x.key === key).bytes, 'original');
  assert.ok(written.every((x) => x.options.httpMetadata.cacheControl.includes('immutable')));
});

test('rejects invalid variants before writing, and preserves original success if an optional variant write fails', async () => {
  let writes = 0;
  let result = await onRequestPost({ request: upload({ file: original(), variant160: new Blob(['html'], { type: 'text/html' }) }), env: { PHOTOS: { put: async () => { writes++; } } } });
  assert.equal(result.status, 400);
  assert.equal(writes, 0);
  result = await onRequestPost({ request: upload({ file: original(), variant160: webp() }), env: {
    R2_PUBLIC_URL: 'https://photos.test', PHOTOS: { put: async (key) => { if (key.startsWith('variants/')) throw new Error('temporary failure'); writes++; } },
  } });
  assert.equal(result.status, 200);
  assert.equal(writes, 1);
});
