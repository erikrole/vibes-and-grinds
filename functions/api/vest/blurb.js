// /api/vest/blurb - AI-generated game narrative using Claude

import { json, jsonError } from '../../../shared/http.js';

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError('ANTHROPIC_API_KEY not configured', 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const { context } = body;
  if (!context || typeof context !== 'string') {
    return jsonError('Missing context string', 400);
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
      return jsonError('AI service error', 502);
    }

    const data = await resp.json();
    const blurb = data.content?.[0]?.text || '';

    return json({ blurb });
  } catch (error) {
    console.error('Blurb generation error:', error);
    return jsonError('Failed to generate blurb');
  }
}
