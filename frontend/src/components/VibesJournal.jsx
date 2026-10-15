import { lazy, Suspense } from 'react';
import VisitList from './VisitList';
import JournalSummary from './JournalSummary';
import VisitToolbar from './VisitToolbar';

const MapExplorer = lazy(() => import('./MapExplorer'));
const InsightsPanel = lazy(() => import('./InsightsPanel'));

const TABS = [
  { id: 'visits', label: 'Visits' },
  { id: 'map', label: 'Map' },
  { id: 'insights', label: 'Insights' },
];

export default function VibesJournal({
  visits,
  sortedVisits,
  loading,
  avgVibe,
  avgCoffee,
  avgComposite,
  viewTab,
  setViewTab,
  seasonVisitCount,
  reviewSeason,
  onOpenSeason,
  searchRef,
  searchQuery,
  setSearchQuery,
  hasActiveFilters,
  sportFilter,
  setSportFilter,
  repeatFilter,
  setRepeatFilter,
  scopeFilter,
  setScopeFilter,
  sortBy,
  setSortBy,
  sortAsc,
  showMobileFilters,
  setShowMobileFilters,
  onEdit,
  onDelete,
  onViewDetails,
  onAddVisit,
  onLogReturnVisit,
  shopVisitCounts,
  topCoffeeOrders,
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-8">
      <JournalSummary
        visitCount={visits.length}
        avgVibe={avgVibe}
        avgCoffee={avgCoffee}
        avgComposite={avgComposite}
      />

      <div className="flex items-center justify-between gap-5 mb-6 border-b border-stone-900/10 dark:border-stone-100/10">
        <div className="flex items-end gap-7 sm:gap-9">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewTab(tab.id)}
              className="tab-edge text-base sm:text-lg"
              aria-pressed={viewTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {seasonVisitCount >= 3 && (
          <button onClick={onOpenSeason} className="season-link hidden sm:inline-flex">
            {reviewSeason} review
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>

      {viewTab === 'insights' ? (
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading insights...</div>}>
          <InsightsPanel visits={visits} />
        </Suspense>
      ) : viewTab === 'map' ? (
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading map...</div>}>
          <MapExplorer visits={visits} onVisitClick={onViewDetails} />
        </Suspense>
      ) : (
        <>
          <VisitToolbar
            searchRef={searchRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hasActiveFilters={hasActiveFilters}
            sortedCount={sortedVisits.length}
            visitCount={visits.length}
            scopeFilter={scopeFilter}
            setScopeFilter={setScopeFilter}
            sportFilter={sportFilter}
            setSportFilter={setSportFilter}
            repeatFilter={repeatFilter}
            setRepeatFilter={setRepeatFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortAsc={sortAsc}
            showMobileFilters={showMobileFilters}
            setShowMobileFilters={setShowMobileFilters}
          />

          <VisitList
            visits={sortedVisits}
            loading={loading}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
            onAddVisit={onAddVisit}
            onLogReturnVisit={onLogReturnVisit}
            hasActiveFilters={hasActiveFilters}
            shopVisitCounts={shopVisitCounts}
          />

          <div className="grid gap-5 mt-8">
            {topCoffeeOrders.length > 0 && (
              <section className="supporting-panel">
                <h2 className="eyebrow mb-4">Frequent orders</h2>
                <ol className="order-list">
                  {topCoffeeOrders.map(({ order, count }) => (
                    <li key={order}><span>{order}</span><strong>{count}</strong></li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </>
      )}
    </main>
  );
}
