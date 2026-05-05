const TOKEN_KEY = 'vng:auth-token';

export function getAuthToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable (private browsing); ignore
  }
}

// Prompt for the access token after a 401. Returns the new token or ''.
export function promptForAuthToken(): string {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return '';
  const entered = window.prompt('Access token required');
  if (!entered) return '';
  const trimmed = entered.trim();
  setAuthToken(trimmed);
  return trimmed;
}
