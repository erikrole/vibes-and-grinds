const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    throw new Error('Failed to create visit');
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

export async function fetchStats() {
  const response = await fetch(`${API_URL}/api/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}
