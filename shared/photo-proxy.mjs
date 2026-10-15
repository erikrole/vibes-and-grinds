import { json } from './auth.mjs';

/**
 * Same-origin copy of a saved visit photo so the share-card canvas can read its pixels.
 * The R2 public bucket sends no CORS headers, and changing bucket CORS is an infrastructure
 * setting, so this streams the image instead. Only the configured R2 host is ever fetched.
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
  if (source.protocol !== 'https:' || source.host !== allowed.host || !source.pathname.startsWith(allowed.pathname.replace(/\/$/, '') + '/')) {
    return json({ error: 'Choose a saved photo.' }, 400);
  }
  let upstream;
  try { upstream = await fetcher(source.toString(), { signal: AbortSignal.timeout(10000) }); } catch { return json({ error: 'Photo is unavailable.' }, 502); }
  const type = upstream.headers.get('Content-Type') || '';
  if (!upstream.ok || !type.startsWith('image/')) return json({ error: 'Photo is unavailable.' }, 502);
  return new Response(upstream.body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' } });
}
