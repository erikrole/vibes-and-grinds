import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import sharp from 'sharp';
import { PHOTO_CACHE_CONTROL, PHOTO_VARIANT_SIZES, photoVariantKey } from '../../shared/photos.mjs';

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const account = option('--account-id');
const output = option('--output');
const apply = args.includes('--apply');
if (!/^[a-f0-9]{32}$/.test(account || '') || !output || !isAbsolute(output)) throw new Error('Provide --account-id and an absolute private --output path.');
const config = join(homedir(), '.wrangler/config/default.toml');
const token = process.env.CLOUDFLARE_API_TOKEN || (existsSync(config) && JSON.parse(readFileSync(config, 'utf8').match(/^oauth_token\s*=\s*(".*")\s*$/m)?.[1] || 'null'));
if (!token) throw new Error('Use an existing R2-scoped API token or run wrangler login.');
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/coffee-photos/objects`;
async function request(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`R2 request failed (${res.status}). No original objects are deleted or overwritten.`);
  return res;
}
const objects = [];
const cursors = new Set();
let cursor = '';
do {
  const query = new URLSearchParams({ per_page: '1000', ...(cursor ? { cursor } : {}) });
  const page = await (await request(`${base}?${query}`)).json();
  if (!page.success || !Array.isArray(page.result)) throw new Error('Invalid object inventory.');
  objects.push(...page.result);
  cursor = page.result_info?.is_truncated ? page.result_info.cursor : '';
  if (page.result_info?.is_truncated && (!cursor || cursors.has(cursor))) throw new Error('Incomplete object inventory.');
  if (cursor) cursors.add(cursor);
} while (cursor);
const byKey = new Map(objects.map((o) => [o.key, o]));
const originals = objects.filter((o) => !o.key.startsWith('variants/') && /^image\/(jpeg|png|webp|heic|heif)$/.test(o.http_metadata?.contentType || ''));
const plan = originals.map((o) => ({ key: o.key, originalBytes: o.size, originalEtag: o.etag,
  variants: PHOTO_VARIANT_SIZES.filter((size) => !byKey.has(photoVariantKey(o.key, size))).map((size) => ({ size, key: photoVariantKey(o.key, size) })) }));
const receipt = { schemaVersion: 1, bucket: 'coffee-photos', applied: apply, completed: false, originalObjects: originals.length,
  originalBytes: originals.reduce((n, o) => n + o.size, 0), plan, writes: [], failures: [] };
function save() { writeFileSync(output, JSON.stringify(receipt, null, 2), { mode: 0o600 }); chmodSync(output, 0o600); }
save();
if (apply) {
  for (const item of plan) {
    if (!item.variants.length) continue;
    try {
      const original = await request(`${base}/${item.key.split('/').map(encodeURIComponent).join('/')}`);
      const bytes = Buffer.from(await original.arrayBuffer());
      const etag = original.headers.get('etag')?.replace(/^"|"$/g, '');
      if (bytes.length !== item.originalBytes || (etag && etag !== item.originalEtag)) throw new Error('Original changed since inventory; skipped.');
      const originalSha256 = createHash('sha256').update(bytes).digest('hex');
      for (const variant of item.variants) {
        const image = sharp(bytes, { limitInputPixels: 40_000_000 }).rotate();
        const resized = variant.size === 1600
          ? image.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          : image.resize({ width: variant.size, height: variant.size, fit: 'cover', withoutEnlargement: true });
        const { data, info } = await resized.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
        await request(`${base}/${variant.key.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: data,
          headers: { 'Content-Type': 'image/webp', 'Cache-Control': PHOTO_CACHE_CONTROL, 'If-None-Match': '*' } });
        receipt.writes.push({ key: variant.key, size: variant.size, bytes: data.length, width: info.width, height: info.height, originalSha256 });
        save();
      }
    } catch (error) { receipt.failures.push({ key: item.key, error: error.message }); save(); }
  }
}
receipt.completed = !apply || receipt.failures.length === 0;
save();
console.log(JSON.stringify({ status: apply ? (receipt.completed ? 'backfilled' : 'partial') : 'dry-run', originals: originals.length,
  originalBytes: receipt.originalBytes, plannedVariants: plan.reduce((n, p) => n + p.variants.length, 0), writtenVariants: receipt.writes.length,
  variantBytesBySize: Object.fromEntries(PHOTO_VARIANT_SIZES.map((size) => [size, receipt.writes.filter((w) => w.size === size).reduce((n, w) => n + w.bytes, 0)])), failures: receipt.failures.length, receipt: output }));
if (!receipt.completed) process.exitCode = 1;
