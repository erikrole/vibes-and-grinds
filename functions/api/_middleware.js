import { authorizeWrite, json } from '../../shared/auth.mjs';

export async function onRequest({ request, env, next }) {
  try {
    const path = new URL(request.url).pathname;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && path !== '/api/owner/session') {
      const denied = await authorizeWrite(request, env);
      if (denied) return denied;
    }
    const response = await next();
    // APIs must never serve one owner's state from a shared cache.
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    console.error('API request failed:', error.message);
    return json({ error: 'Could not complete this request. Please try again.' }, 500);
  }
}
