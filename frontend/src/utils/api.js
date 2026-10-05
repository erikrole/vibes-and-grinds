// Use relative URLs in production (for Cloudflare Pages Functions)
// Use full URL in development
const API_URL = import.meta.env.VITE_API_URL || '';

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
