// Use relative URLs in production (for Cloudflare Pages Functions)
// Use full URL in development
const API_URL = import.meta.env.VITE_API_URL || '';
const WRITE_KEY_HEADER = 'X-Write-Key';
const WRITE_KEY_STORAGE = 'vibes_write_key';

function getStoredWriteKey() {
  if (typeof window === 'undefined') return '';
  try {
    return `${window.localStorage.getItem(WRITE_KEY_STORAGE) || ''}`.trim();
  } catch {
    return '';
  }
}

/** Prefer build-time key; fall back to a key Erik saved after a prompt. */
export function getWriteKey() {
  const fromEnv = `${import.meta.env.VITE_WRITE_KEY || ''}`.trim();
  return fromEnv || getStoredWriteKey();
}

export function setWriteKey(key) {
  if (typeof window === 'undefined') return;
  const trimmed = `${key || ''}`.trim();
  try {
    if (trimmed) window.localStorage.setItem(WRITE_KEY_STORAGE, trimmed);
    else window.localStorage.removeItem(WRITE_KEY_STORAGE);
  } catch {
    // ignore quota / private mode
  }
}

function promptForWriteKey(message) {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return '';
  const entered = window.prompt(message);
  if (entered == null) return '';
  const trimmed = entered.trim();
  if (trimmed) setWriteKey(trimmed);
  return trimmed;
}

async function parseErrorResponse(response, fallbackMessage) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || fallbackMessage);
}

/**
 * Attach X-Write-Key for mutations.
 * When interactive (default), a 401 prompts once and retries so Erik can save
 * without baking the secret into the public bundle. Background syncs should
 * pass { interactive: false } so anonymous viewers are not interrupted.
 */
async function fetchWithWriteAuth(url, options = {}, { interactive = true } = {}) {
  const headers = new Headers(options.headers || {});
  const existingKey = getWriteKey();
  if (existingKey) headers.set(WRITE_KEY_HEADER, existingKey);

  let response = await fetch(url, { ...options, headers });

  if (interactive && response.status === 401) {
    const prompted = promptForWriteKey(
      'Write key missing or incorrect. Enter the site write key to continue:'
    );
    if (prompted) {
      headers.set(WRITE_KEY_HEADER, prompted);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

export async function fetchVisits() {
  const response = await fetch(`${API_URL}/api/visits`);
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to fetch visits');
  }
  return response.json();
}

export async function createVisit(visitData) {
  const response = await fetchWithWriteAuth(`${API_URL}/api/visits`, {
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
  const response = await fetchWithWriteAuth(`${API_URL}/api/visits/${id}`, {
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
  const response = await fetchWithWriteAuth(`${API_URL}/api/visits/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to delete visit');
  }
}

export async function uploadPhoto(file) {
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  const response = await fetchWithWriteAuth(`${API_URL}/api/upload`, {
    method: 'POST',
    body: uploadFormData,
  });
  if (!response.ok) {
    await parseErrorResponse(response, 'Failed to upload photo');
  }
  return response.json();
}

export async function fetchVestGames() {
  const response = await fetch(`${API_URL}/api/vest/games`);
  if (!response.ok) throw new Error('Failed to fetch vest games');
  return response.json();
}

export async function syncVestGames(games) {
  const response = await fetchWithWriteAuth(`${API_URL}/api/vest/games`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ games }),
  });

  if (!response.ok) throw new Error('Failed to sync vest games');
  return response.json();
}

export async function fetchVestScores(season = '2025') {
  const response = await fetch(`${API_URL}/api/vest/scores?season=${season}`);
  if (!response.ok) throw new Error('Failed to fetch vest scores');
  return response.json();
}

export async function fetchVestGameStats(eventId) {
  const response = await fetch(`${API_URL}/api/vest/game-stats/${eventId}`);
  if (!response.ok) throw new Error('Failed to fetch game stats');
  return response.json();
}

export async function fetchVestBlurb(context) {
  const response = await fetchWithWriteAuth(`${API_URL}/api/vest/blurb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  if (!response.ok) throw new Error('Failed to generate blurb');
  return response.json();
}
