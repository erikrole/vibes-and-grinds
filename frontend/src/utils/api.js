// Use relative URLs in production (for Cloudflare Pages Functions)
// Use full URL in development
import { freshPayload } from '../../../functions/api/vest/_freshCache.js';

const API_URL = import.meta.env.VITE_API_URL || '';
const SCORE_CACHE_TTL_MS = 2 * 60 * 1000;
const BOX_CACHE_TTL_MS = 60 * 1000;
const scoreCache = new Map();
const boxCache = new Map();

async function parseErrorResponse(response, fallbackMessage) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || fallbackMessage);
}

export async function fetchVisits() {
  const response = await fetch(`${API_URL}/api/visits`);
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to fetch visits');
  }
  return response.json();
}

export async function createVisit(visitData) {
  const response = await fetch(`${API_URL}/api/visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(visitData),
  });
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to create visit');
  }
  return response.json();
}

export async function updateVisit(id, visitData) {
  const response = await fetch(`${API_URL}/api/visits/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(visitData),
  });
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to update visit');
  }
  return response.json();
}

export async function deleteVisit(id) {
  const response = await fetch(`${API_URL}/api/visits/${id}`, {
    method: 'DELETE',
  });
  // The row is already gone. Callers should drop it from the list.
  if (response.status === 404) return;
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to delete visit');
  }
}



export async function fetchVestGames() {
  const response = await fetch(`${API_URL}/api/vest/games`);
  if (!response.ok) throw new Error('Failed to fetch vest games');
  return response.json();
}

export async function syncVestGames(games) {
  const response = await fetch(`${API_URL}/api/vest/games`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ games }),
  });

  if (!response.ok) throw new Error('Failed to sync vest games');
  return response.json();
}

export async function fetchVestScores(season = '2025') {
  const key = String(season);
  const cached = freshPayload(scoreCache.get(key), Date.now(), SCORE_CACHE_TTL_MS);
  if (cached) return cached;

  const response = await fetch(`${API_URL}/api/vest/scores?season=${season}`);
  if (!response.ok) throw new Error('Failed to fetch vest scores');
  const payload = await response.json();
  scoreCache.set(key, { storedAt: Date.now(), payload });
  return payload;
}

export async function fetchVestGameStats(eventId) {
  const key = String(eventId);
  const cached = freshPayload(boxCache.get(key), Date.now(), BOX_CACHE_TTL_MS);
  if (cached) return cached;

  const response = await fetch(`${API_URL}/api/vest/game-stats/${eventId}`);
  if (!response.ok) throw new Error('Failed to fetch game stats');
  const payload = await response.json();
  boxCache.set(key, { storedAt: Date.now(), payload });
  return payload;
}

export async function fetchVestBlurb(context) {
  const response = await fetch(`${API_URL}/api/vest/blurb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  if (!response.ok) throw new Error('Failed to generate blurb');
  return response.json();
}
