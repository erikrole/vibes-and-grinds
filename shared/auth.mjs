const SESSION_SECONDS = 12 * 60 * 60;
const encoder = new TextEncoder();
export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
});

export async function hash(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function equal(a, b) {
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) different |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return different === 0;
}

function cookieName(request) {
  return new URL(request.url).protocol === 'https:' ? '__Host-vg_owner' : 'vg_owner';
}

function cookie(request, token, seconds = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure}`;
}

function sessionToken(request) {
  return (request.headers.get('Cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName(request)}=`))?.split('=')[1] || '';
}

export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

export async function isOwner(request, env) {
  if (!env.OWNER_KEY_HASH || !env.DB) return false;
  const token = sessionToken(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const session = await env.DB.prepare('SELECT expires_at FROM owner_sessions WHERE token_hash = ?')
    .bind(await hash(`${env.OWNER_KEY_HASH}:${token}`)).first();
  return Boolean(session && session.expires_at > Math.floor(Date.now() / 1000));
}

export async function authorizeWrite(request, env) {
  if (!sameOrigin(request)) return json({ error: 'This action must come from this site.' }, 403);
  if (!(await isOwner(request, env))) return json({ error: 'Sign in as the owner to make changes.' }, 401);
  return null;
}

export async function ownerSession(request, env) {
  const method = request.method;
  if (method === 'GET') return json({ owner: await isOwner(request, env), configured: Boolean(env.OWNER_KEY_HASH) });
  if (!sameOrigin(request)) return json({ error: 'This action must come from this site.' }, 403);
  if (method === 'DELETE') {
    const token = sessionToken(request);
    if (token) await env.DB.prepare('DELETE FROM owner_sessions WHERE token_hash = ?').bind(await hash(`${env.OWNER_KEY_HASH}:${token}`)).run();
    return json({ owner: false }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  }
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.OWNER_KEY_HASH) return json({ error: 'Owner sign-in is not configured yet.' }, 503);

  // The access key is generated with 256 bits of entropy, not a human password.
  // Only its digest is configured on the server. Never log the key or cookies.
  const text = await request.text();
  if (text.length > 4096) return json({ error: 'Invalid access key.' }, 400);
  let key;
  try { key = JSON.parse(text).key; } catch { return json({ error: 'Invalid access key.' }, 400); }
  if (typeof key !== 'string' || key.length > 256) return json({ error: 'Invalid access key.' }, 400);

  const now = Math.floor(Date.now() / 1000);
  const client = await hash(request.headers.get('CF-Connecting-IP') || 'local');
  const attempt = await env.DB.prepare(`INSERT INTO owner_login_attempts (client_hash, attempts, window_start)
    VALUES (?, 1, ?) ON CONFLICT(client_hash) DO UPDATE SET
    attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END,
    window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END
    RETURNING attempts`).bind(client, now, now - 900, now - 900).first();
  if (attempt.attempts > 8) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429, { 'Retry-After': '900' });
  if (!equal(await hash(key.trim()), env.OWNER_KEY_HASH)) return json({ error: 'That access key didn’t match.' }, 401);

  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM owner_sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM owner_login_attempts WHERE client_hash = ? OR window_start < ?').bind(client, now - 900),
    env.DB.prepare('INSERT INTO owner_sessions (token_hash, expires_at) VALUES (?, ?)').bind(await hash(`${env.OWNER_KEY_HASH}:${token}`), now + SESSION_SECONDS),
  ]);
  return json({ owner: true }, 200, { 'Set-Cookie': cookie(request, token) });
}
