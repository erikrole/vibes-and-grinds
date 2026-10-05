// Maps tokens are public browser credentials, restricted to approved domains.
// Never put an Apple .p8 private key in this endpoint or the frontend bundle.
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ token: env.APPLE_MAPS_TOKEN || null }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
