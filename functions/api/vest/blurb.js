// /api/vest/blurb - AI-generated game narrative using Claude

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { context } = body;
  if (!context || typeof context !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing context string' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `You are a fun, superstitious college basketball color commentator. Based on this outfit/game data, write a 1-2 sentence hype blurb. Be witty, reference specific stats, and lean into the superstition angle. Keep it short and punchy.\n\n${context}`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Anthropic API error:', resp.status, err);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const blurb = data.content?.[0]?.text || '';

    return new Response(JSON.stringify({ blurb }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blurb generation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate blurb' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
