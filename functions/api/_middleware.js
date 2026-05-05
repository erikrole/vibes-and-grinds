// Bearer-token auth + safe error responses for all /api/* requests.
//
// If AUTH_TOKEN is not set in the Pages environment, requests pass through
// unauthenticated (preserves the existing dev behavior on a fresh deploy).
// In production, set AUTH_TOKEN as a Pages secret to enable gating.

const PUBLIC_PATHS = new Set([
  '/api/health',
]);

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return next();
  }

  if (PUBLIC_PATHS.has(url.pathname)) {
    return next();
  }

  const expected = env.AUTH_TOKEN;
  if (expected) {
    const header = request.headers.get('authorization') || '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (provided !== expected) {
      return jsonError('Unauthorized', 401);
    }
  }

  try {
    return await next();
  } catch (error) {
    console.error(`Unhandled error in ${url.pathname}:`, error);
    return jsonError('Internal server error', 500);
  }
}
