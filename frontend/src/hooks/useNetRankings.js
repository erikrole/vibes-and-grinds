import { useEffect, useState } from 'react';
import { netEntriesToRows, normalizeNetResponse } from '../utils/vestStats';

const NET_RANKINGS_URL = import.meta.env.VITE_NET_RANKINGS_URL || '';
const NET_FETCH_PATHS = ['/api/vest/net-rankings', '/api/vest/net'];

/**
 * Fetch NET rankings from the first-responding source. Returns
 * { rankings, status } where status is one of
 * 'idle' | 'loading' | 'loaded' | 'error'.
 */
export default function useNetRankings() {
  const [rankings, setRankings] = useState([]);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const sources = [
      ...NET_FETCH_PATHS,
      ...(NET_RANKINGS_URL ? [NET_RANKINGS_URL] : []),
    ];
    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const payload = await response.json();
          const rows = netEntriesToRows(normalizeNetResponse(payload));
          if (!rows.length) continue;
          if (!cancelled) {
            setRankings(rows);
            setStatus('loaded');
          }
          return;
        } catch {
          // try next source
        }
      }
      if (!cancelled) {
        setRankings([]);
        setStatus('error');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rankings, status };
}
