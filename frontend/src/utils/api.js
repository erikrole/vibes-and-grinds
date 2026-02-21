// Use relative URLs in production (for Cloudflare Pages Functions)
// Use full URL in development
const API_URL = import.meta.env.VITE_API_URL || '';

export async function fetchVisits() {
  const response = await fetch(`${API_URL}/api/visits`);
  if (!response.ok) {
    throw new Error('Failed to fetch visits');
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
    const errorData = await response.json().catch(() => ({}));
    console.error('Create visit error:', errorData);
    throw new Error(errorData.error || 'Failed to create visit');
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
    throw new Error('Failed to update visit');
  }
  return response.json();
}

export async function deleteVisit(id) {
  const response = await fetch(`${API_URL}/api/visits/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete visit');
  }
}

