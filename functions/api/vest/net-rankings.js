// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage

export async function onRequestGet({ env }) {
  const netRankingsUrl = env.NET_RANKINGS_URL;

  if (!netRankingsUrl) {
    return new Response(JSON.stringify({
      error: 'NET rankings feed is not configured.',
      details: 'Set NET_RANKINGS_URL in Cloudflare environment variables.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(netRankingsUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch NET rankings from upstream source.',
        status: response.status,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching vest NET rankings:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch vest NET rankings',
      details: error.message,
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
