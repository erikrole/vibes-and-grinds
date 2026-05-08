import { useEffect, useRef, useState } from 'react';
import { vestGames as seedGames } from '../utils/vestTrackerData';
import { fetchVestGames, syncVestGames } from '../utils/api';

const VEST_GAMES_KEY = 'vibes-and-grinds:vest-games';

function loadGames() {
  try {
    const raw = localStorage.getItem(VEST_GAMES_KEY);
    if (raw) return { games: JSON.parse(raw), corrupted: false };
  } catch {
    return { games: seedGames, corrupted: true };
  }
  return { games: seedGames, corrupted: false };
}

/**
 * Owns the vest games array. Hydrates from localStorage immediately, then
 * pulls the canonical copy from the server, then mirrors any local edits
 * back to localStorage and the server.
 *
 * Returns [games, setGames, { corrupted }] so the caller can warn the user
 * when localStorage was unparseable on load.
 */
export default function useVestGames() {
  const corruptedRef = useRef(false);
  const [games, setGames] = useState(() => {
    const { games: loaded, corrupted } = loadGames();
    if (corrupted) corruptedRef.current = true;
    return loaded;
  });
  const [syncReady, setSyncReady] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(VEST_GAMES_KEY, JSON.stringify(games));
    } catch {
      // ignore (e.g. private browsing quota)
    }
  }, [games]);

  useEffect(() => {
    let cancelled = false;
    fetchVestGames()
      .then((payload) => {
        const serverGames = Array.isArray(payload?.games) ? payload.games : [];
        if (!cancelled && serverGames.length > 0) setGames(serverGames);
      })
      .catch(() => {
        // fall back to localStorage seed data
      })
      .finally(() => {
        if (!cancelled) setSyncReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!syncReady) return;
    syncVestGames(games).catch(() => {
      // ignore offline/dev sync failures
    });
  }, [games, syncReady]);

  return [games, setGames, { corruptedOnLoad: corruptedRef.current }];
}
