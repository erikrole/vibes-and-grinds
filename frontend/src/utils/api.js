import { toScheduleGames } from '../../../shared/vest-schedule.mjs';

// Use relative URLs in production (for Cloudflare Pages Functions)
// Use full URL in development
const API_URL = import.meta.env.VITE_API_URL || '';
const ESPN_SCHEDULE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/275/schedule';

async function parseErrorResponse(response, fallbackMessage) {
  const errorData = await response.json().catch(() => ({}));
  if (response.status === 401) window.dispatchEvent(new Event('vg:sign-in-required'));
  throw new Error(errorData.error || fallbackMessage);
}

export async function ownerRequest(path = 'session', method = 'GET', body) {
  const response = await fetch(`${API_URL}/api/owner/${path}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) await parseErrorResponse(response, 'Could not complete this request.');
  return response.json();
}

export const restoreVisit = (id) => ownerRequest(`trash/${id}`, 'POST');

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
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to delete visit');
  }
}



export async function fetchVestGames() {
  const response = await fetch(`${API_URL}/api/vest/games`);
  if (!response.ok) throw new Error('Failed to fetch vest games');
  return response.json();
}

export async function syncVestGames(games, revision) {
  const response = await fetch(`${API_URL}/api/vest/games`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ games, revision }),
  });

  if (!response.ok) await parseErrorResponse(response, 'Could not save game records.');
  return response.json();
}

/** Wisconsin games on one date. Suggestions are optional, so any failure is just "no games". */
export async function fetchBadgerGames(date, signal) {
  try {
    const response = await fetch(`${API_URL}/api/badger-games?${new URLSearchParams({ date })}`, { signal });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.games) ? payload.games : [];
  } catch {
    return [];
  }
}

export async function fetchVestSchedule(season) {
  const query = `?${new URLSearchParams({ season: String(season) })}`;
  try {
    const response = await fetch(`${API_URL}/api/vest/schedule${query}`);
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.events)) return payload;
    }
  } catch { /* The browser can read ESPN directly when the function is not deployed yet. */ }
  const batches = await Promise.all([2, 3].map(async (type) => {
    const response = await fetch(`${ESPN_SCHEDULE}?season=${encodeURIComponent(season)}&seasontype=${type}`);
    if (!response.ok) {
      if (type === 2) throw new Error('ESPN unavailable');
      return [];
    }
    const payload = await response.json();
    return payload.events || [];
  }));
  return { season: Number(season), events: toScheduleGames(batches.flat()), source: 'espn' };
}

export async function fetchVestScores(season) {
  const query = season ? `?${new URLSearchParams({ season })}` : '';
  const response = await fetch(`${API_URL}/api/vest/scores${query}`);
  if (!response.ok) throw new Error('Failed to fetch vest scores');
  return response.json();
}

export async function fetchVestGameStats(eventId) {
  const response = await fetch(`${API_URL}/api/vest/game-stats/${eventId}`);
  if (!response.ok) throw new Error('Failed to fetch game stats');
  return response.json();
}
