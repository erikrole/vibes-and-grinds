import { useEffect, useRef } from 'react';
import { computeBadges, detectNewBadges } from '../utils/badges';

/**
 * Watches `visits` and fires a toast whenever a badge level increases.
 * The first run after mount only seeds the previous-state ref; subsequent
 * runs diff and notify.
 */
export default function useBadgeNotifications(visits, toast) {
  const prevRef = useRef(null);

  useEffect(() => {
    if (!visits.length) return;
    const next = computeBadges(visits);
    if (prevRef.current) {
      const unlocked = detectNewBadges(prevRef.current, next);
      unlocked.forEach((b) => {
        toast?.show(`${b.icon} Badge: ${b.name} (${b.tier})`);
      });
    }
    prevRef.current = next;
  }, [visits, toast]);
}
