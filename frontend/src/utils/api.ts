import { getAuthToken, promptForAuthToken } from './auth';
import type { Visit, VisitInput, VestGame } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiFetchOptions {
  retryOn401?: boolean;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  { retryOn401 = true }: ApiFetchOptions = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && retryOn401) {
    const newToken = promptForAuthToken();
    if (newToken) {
      return apiFetch(path, options, { retryOn401: false });
    }
  }

  return response;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({} as { error?: string }));
  return (data as { error?: string }).error || fallback;
}

async function expectJson<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackError));
  }
  return response.json() as Promise<T>;
}

export async function fetchVisits(): Promise<Visit[]> {
  const response = await apiFetch('/api/visits');
  return expectJson<Visit[]>(response, 'Failed to fetch visits');
}

export async function createVisit(visitData: VisitInput): Promise<Visit> {
  const response = await apiFetch('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitData),
  });
  return expectJson<Visit>(response, 'Failed to create visit');
}

export async function updateVisit(id: number, visitData: VisitInput): Promise<Visit> {
  const response = await apiFetch(`/api/visits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitData),
  });
  return expectJson<Visit>(response, 'Failed to update visit');
}

export async function deleteVisit(id: number): Promise<void> {
  const response = await apiFetch(`/api/visits/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete visit'));
  }
}

export async function fetchVestGames(): Promise<{ games: VestGame[] }> {
  const response = await apiFetch('/api/vest/games');
  return expectJson(response, 'Failed to fetch vest games');
}

export async function syncVestGames(games: VestGame[]): Promise<{ success: boolean; saved: number; skipped?: number }> {
  const response = await apiFetch('/api/vest/games', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ games }),
  });
  return expectJson(response, 'Failed to sync vest games');
}

export async function fetchVestScores(season: string = '2025'): Promise<unknown> {
  const response = await apiFetch(`/api/vest/scores?season=${season}`);
  return expectJson(response, 'Failed to fetch vest scores');
}

export async function fetchVestGameStats(eventId: string): Promise<unknown> {
  const response = await apiFetch(`/api/vest/game-stats/${eventId}`);
  return expectJson(response, 'Failed to fetch game stats');
}

export async function fetchVestBlurb(context: string): Promise<{ blurb: string }> {
  const response = await apiFetch('/api/vest/blurb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  return expectJson(response, 'Failed to generate blurb');
}

export async function fetchVestNetRankings(path: string = '/api/vest/net-rankings'): Promise<unknown> {
  const response = await apiFetch(path);
  return expectJson(response, 'Failed to fetch NET rankings');
}

export async function uploadPhoto(file: File | Blob): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiFetch('/api/upload', { method: 'POST', body: formData });
  return expectJson(response, 'Failed to upload photo');
}

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export async function fetchPlacesAutocomplete(
  query: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<{ suggestions: PlaceSuggestion[] }> {
  const response = await apiFetch(
    `/api/places-autocomplete?input=${encodeURIComponent(query)}`,
    { signal }
  );
  return expectJson(response, 'Autocomplete failed');
}

export async function fetchPlaceDetails(placeId: string): Promise<{
  place: { name: string; address: string; place_id: string; lat: number | string; lng: number | string };
}> {
  const response = await apiFetch(
    `/api/places-details?placeId=${encodeURIComponent(placeId)}`
  );
  return expectJson(response, 'Place details failed');
}
