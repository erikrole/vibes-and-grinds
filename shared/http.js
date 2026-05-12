// Shared HTTP response helpers for Cloudflare Pages Functions.
// Workers (workers/*) keep their own response builders because they
// also set CORS headers; backend (Node Express) uses res.json().

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function json(data, status = 200, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: extraHeaders ? { ...JSON_HEADERS, ...extraHeaders } : JSON_HEADERS,
  });
}

export function jsonError(message, status = 500, extra) {
  const payload = extra ? { error: message, ...extra } : { error: message };
  return json(payload, status);
}
