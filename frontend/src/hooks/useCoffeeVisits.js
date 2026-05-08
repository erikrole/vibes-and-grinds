import { useEffect, useState } from 'react';
import { fetchVisits } from '../utils/api';

/**
 * Loads coffee visits once on mount. Used by the Vest Tracker for the
 * coffee-crossover panel. Errors are swallowed — the panel just won't
 * render if the request fails.
 */
export default function useCoffeeVisits() {
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchVisits()
      .then((data) => {
        if (cancelled) return;
        setVisits(Array.isArray(data) ? data : data?.visits || []);
      })
      .catch(() => {
        // silently ignore — crossover panel will be empty
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return visits;
}
