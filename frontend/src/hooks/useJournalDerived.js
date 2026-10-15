import { useMemo } from 'react';
import { titleCaseOrder } from '../utils/display';
import { getAvailableSeasons, getCurrentSeason, getSeasonVisits } from '../utils/yearReview';
import { getShopRepeatKey, getShopVisitCounts } from '../utils/repeats';
import { getVisitType } from '../utils/visitTypes';

export default function useJournalDerived(visits, {
  sortBy,
  sortAsc,
  searchQuery,
  sportFilter,
  repeatFilter,
  scopeFilter,
}) {
  const shopVisitCounts = useMemo(() => getShopVisitCounts(visits), [visits]);

  const filteredVisits = useMemo(() => visits.filter((visit) => {
    if (scopeFilter && getVisitType(visit) !== scopeFilter) {
      return false;
    }

    if (sportFilter && visit.sport !== sportFilter) {
      return false;
    }

    if (repeatFilter) {
      const visitCount = shopVisitCounts[getShopRepeatKey(visit)] || 1;
      if (repeatFilter === 'first' && visitCount > 1) return false;
      if (repeatFilter === 'regular' && visitCount < 2) return false;
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    return (
      visit.coffee_shop_name.toLowerCase().includes(query) ||
      visit.city?.toLowerCase().includes(query) ||
      visit.opponent?.toLowerCase().includes(query) ||
      visit.coffee_order?.toLowerCase().includes(query) ||
      visit.notes?.toLowerCase().includes(query)
    );
  }), [visits, scopeFilter, sportFilter, repeatFilter, searchQuery, shopVisitCounts]);

  const sortedVisits = useMemo(() => [...filteredVisits].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    switch (sortBy) {
      case 'date':
        return dir * (new Date(b.date) - new Date(a.date));
      case 'vibe':
        return dir * (b.vibe_rating - a.vibe_rating);
      case 'coffee':
        return dir * (b.coffee_rating - a.coffee_rating);
      case 'composite':
        return dir * (b.composite_score - a.composite_score);
      default:
        return 0;
    }
  }), [filteredVisits, sortBy, sortAsc]);

  const hasActiveFilters = Boolean(searchQuery || sportFilter || repeatFilter || scopeFilter);

  const avgVibe = useMemo(
    () =>
      visits.length ? (visits.reduce((sum, visit) => sum + visit.vibe_rating, 0) / visits.length).toFixed(1) : '0.0',
    [visits]
  );
  const avgCoffee = useMemo(
    () =>
      visits.length
        ? (visits.reduce((sum, visit) => sum + visit.coffee_rating, 0) / visits.length).toFixed(1)
        : '0.0',
    [visits]
  );
  const avgComposite = useMemo(
    () =>
      visits.length
        ? (visits.reduce((sum, visit) => sum + visit.composite_score, 0) / visits.length).toFixed(1)
        : '0.0',
    [visits]
  );

  const topCoffeeOrders = useMemo(() => {
    const orderCounts = {};
    visits.forEach((visit) => {
      const order = titleCaseOrder(visit.coffee_order);
      if (order) {
        orderCounts[order] = (orderCounts[order] || 0) + 1;
      }
    });

    return Object.entries(orderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([order, count]) => ({ order, count }));
  }, [visits]);
  const reviewSeason = useMemo(() => getAvailableSeasons(visits)[0] || getCurrentSeason(), [visits]);
  // The season report covers road trips only, so gate the link on those.
  const seasonVisitCount = useMemo(() => getSeasonVisits(visits).length, [visits]);

  return {
    shopVisitCounts,
    sortedVisits,
    hasActiveFilters,
    avgVibe,
    avgCoffee,
    avgComposite,
    topCoffeeOrders,
    reviewSeason,
    seasonVisitCount,
  };
}
