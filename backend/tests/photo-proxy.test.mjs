import test from 'node:test';
import assert from 'node:assert/strict';
import { photoProxyRoute } from '../../shared/photo-proxy.mjs';

const env = { R2_PUBLIC_URL: 'https://pub-abc.r2.dev' };
const req = (url) => new Request(`https://coffee.test/api/photo?url=${encodeURIComponent(url)}`);
const image = async () => new Response('bytes', { headers: { 'Content-Type': 'image/jpeg' } });

test('streams a photo from the configured R2 host', async () => {
  const res = await photoProxyRoute(req('https://pub-abc.r2.dev/1-a.jpg'), env, image);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(await res.text(), 'bytes');
});

test('refuses other hosts, plain http, look-alike hosts and junk', async () => {
  let called = false;
  const spy = async () => { called = true; return image(); };
  for (const url of ['https://evil.example/x.jpg', 'http://pub-abc.r2.dev/x.jpg', 'https://pub-abc.r2.dev.evil.example/x.jpg', 'not a url', '']) {
    assert.equal((await photoProxyRoute(req(url), env, spy)).status, 400, url);
  }
  assert.equal((await photoProxyRoute(req('https://pub-abc.r2.dev/x.jpg'), {}, spy)).status, 400);
  assert.equal(called, false);
});

test('non-images and upstream failures become 502', async () => {
  assert.equal((await photoProxyRoute(req('https://pub-abc.r2.dev/x'), env, async () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }))).status, 502);
  assert.equal((await photoProxyRoute(req('https://pub-abc.r2.dev/x'), env, async () => { throw new Error('down'); })).status, 502);
});
