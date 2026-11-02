import { json } from './auth.mjs';
import { photoVariantUrl } from './photos.mjs';

/**
 * Same-origin copy of a saved visit photo so the share-card canvas can read its pixels.
 * Streams an optimized display variant when available, preserving the original fallback.
 * Only a configured source host or its fixed managed CDN variant is ever fetched.
 */
export async function photoProxyRoute(request, env, fetcher = fetch) {
  const raw = new URL(request.url).searchParams.get('url') || '';
  let source;
  let allowed;
  try {
    source = new URL(raw);
    allowed = new URL(env.R2_PUBLIC_URL);
  } catch {
    return json({ error: 'Choose a saved photo.' }, 400);
  }
  if (source.protocol !== 'https:' || source.username || source.password || source.host !== allowed.host || !source.pathname.startsWith(allowed.pathname.replace(/\/$/, '') + '/')) {
    return json({ error: 'Choose a saved photo.' }, 400);
  }
  let upstream;
  const preferred = photoVariantUrl(source.toString());
  if (preferred !== source.toString()) {
    try { upstream = await fetcher(preferred, { signal: AbortSignal.timeout(10000), redirect: 'error' }); } catch { /* Original remains available. */ }
    if (!upstream?.ok || !(upstream.headers.get('Content-Type') || '').startsWith('image/')) upstream = null;
  }
  if (!upstream) {
    try { upstream = await fetcher(source.toString(), { signal: AbortSignal.timeout(10000), redirect: 'error' }); } catch { return json({ error: 'Photo is unavailable.' }, 502); }
  }
  const type = upstream.headers.get('Content-Type') || '';
  if (!upstream.ok || !type.startsWith('image/')) return json({ error: 'Photo is unavailable.' }, 502);
  return new Response(upstream.body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' } });
}
