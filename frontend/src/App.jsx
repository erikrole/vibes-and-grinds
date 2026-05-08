import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import FormModal from './components/FormModal';
import LazyMount from './components/LazyMount';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader, { APP_MODES } from './components/AppHeader';
import StatsHero from './components/StatsHero';
import SeasonReviewBanner from './components/SeasonReviewBanner';
import VisitsToolbar from './components/VisitsToolbar';
import Toast from './components/Toast';
import useDarkMode from './hooks/useDarkMode';
import useLocalStorage from './hooks/useLocalStorage';
import useToast from './hooks/useToast';
import useVisits from './hooks/useVisits';
import useAppShortcuts from './hooks/useAppShortcuts';
import useBadgeNotifications from './hooks/useBadgeNotifications';
import {
  averageRatings,
  filterVisits,
  shopVisitCounts,
  sortVisits,
  topCoffeeOrders,
} from './utils/visitFiltering';

const VisitDetailModal = lazy(() => import('./components/VisitDetailModal'));
const VisitsMap = lazy(() => import('./components/VisitsMap'));
const VestTrackerDashboard = lazy(() => import('./components/VestTrackerDashboard'));
const InsightsPanel = lazy(() => import('./components/InsightsPanel'));
const YearInReview = lazy(() => import('./components/YearInReview'));

const isVestDomain = window.location.hostname.startsWith('vests.');

export default function App() {
  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();
  const visitsBag = useVisits(toastBag);

  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [viewingVisit, setViewingVisit] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showYearReview, setShowYearReview] = useState(false);
  const searchRef = useRef(null);

  const [viewPrefs, setViewPrefs] = useLocalStorage('vibes-and-grinds:view-preferences', {
    sortBy: 'date',
    searchQuery: '',
    sportFilter: '',
    appMode: isVestDomain ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const viewTab = viewPrefs.viewTab || 'visits';
  const appMode = isVestDomain
    ? APP_MODES.VEST
    : (viewPrefs.appMode || APP_MODES.VIBES);
  const isVibes = appMode === APP_MODES.VIBES;

  const setSortBy = (v) =>
    setViewPrefs((p) => (p.sortBy === v ? { ...p, sortAsc: !p.sortAsc } : { ...p, sortBy: v, sortAsc: false }));
  const setSearchQuery = (v) => setViewPrefs((p) => ({ ...p, searchQuery: v }));
  const setSportFilter = (v) => setViewPrefs((p) => ({ ...p, sportFilter: v }));
  const setViewTab = (v) => setViewPrefs((p) => ({ ...p, viewTab: v }));
  const setAppMode = (v) =>
    setViewPrefs((p) => ({ ...p, appMode: typeof v === 'function' ? v(p.appMode) : v }));

  const { visits, loading, error } = visitsBag;

  useAppShortcuts({
    appMode,
    isVibesMode: isVibes,
    isViewingVisit: Boolean(viewingVisit),
    isEditingVisit: Boolean(editingVisit),
    focusSearch: () => searchRef.current?.focus(),
    toggleMode: () => setAppMode((prev) => (prev === APP_MODES.VIBES ? APP_MODES.VEST : APP_MODES.VIBES)),
    toggleShortcuts: () => setShowShortcuts((prev) => !prev),
    toggleDarkMode,
    newVisit: () => setShowForm(true),
  });

  useBadgeNotifications(visits, toastBag);

  // ── Visit handlers (UI shells around useVisits's mutations) ──────────────

  const handleAddVisit = async (data) => {
    await visitsBag.add(data);
    setShowForm(false);
  };

  const handleUpdateVisit = async (data) => {
    if (!editingVisit) return;
    await visitsBag.update(editingVisit.id, data);
    setEditingVisit(null);
  };

  const handleDeleteVisit = async (id) => {
    await visitsBag.remove(id);
    setViewingVisit((prev) => (prev?.id === id ? null : prev));
  };

  const handleDuplicateVisit = async (visit) => {
    const duplicated = await visitsBag.duplicate(visit);
    setViewingVisit(null);
    setEditingVisit(duplicated);
  };

  const handleModalUpdateVisit = async (id, data) => {
    const updated = await visitsBag.update(id, data);
    setViewingVisit(updated);
  };

  const handleEditVisit = (visit) => {
    setEditingVisit(visit);
    setShowForm(false);
    setViewingVisit(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingVisit(null);
  };

  // ── Derivations ──────────────────────────────────────────────────────────

  const filteredVisits = useMemo(
    () => filterVisits(visits, { searchQuery, sportFilter }),
    [visits, searchQuery, sportFilter]
  );
  const sortedVisits = useMemo(
    () => sortVisits(filteredVisits, { sortBy, ascending: sortAsc }),
    [filteredVisits, sortBy, sortAsc]
  );
  const averages = useMemo(() => averageRatings(visits), [visits]);
  const topOrders = useMemo(() => topCoffeeOrders(visits), [visits]);
  const shopCounts = useMemo(() => shopVisitCounts(visits), [visits]);
  const hasActiveFilters = Boolean(searchQuery || sportFilter);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen transition-colors duration-200 ${
          appMode === APP_MODES.VEST ? 'bg-stone-50 dark:bg-stone-900' : ''
        }`}
      >
        <AppHeader
          appMode={appMode}
          setAppMode={setAppMode}
          lockMode={isVestDomain}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          showAddVisitButton={isVibes && !showForm && !editingVisit}
          onAddVisit={() => setShowForm(true)}
        />

        {appMode === APP_MODES.VEST ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">
                Loading...
              </div>
            }
          >
            <VestTrackerDashboard showToast={toastBag.show} />
          </Suspense>
        ) : loading ? (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true">
            <div className="flex items-center justify-center py-20 text-stone-400 dark:text-stone-500 animate-pulse">
              Loading visits…
            </div>
          </main>
        ) : (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-5 py-4 rounded-2xl transition-colors">
                {error}
              </div>
            )}

            <StatsHero visitCount={visits.length} averages={averages} />

            {visits.length >= 3 && <SeasonReviewBanner onOpen={() => setShowYearReview(true)} />}

            <div className="flex items-end gap-7 sm:gap-9 mb-6 border-b border-stone-900/10 dark:border-stone-100/10">
              {[
                { id: 'visits', label: 'Visits' },
                { id: 'insights', label: 'Insights' },
              ].map((tab) => (
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

            {viewTab === 'insights' ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">
                    Loading insights...
                  </div>
                }
              >
                <InsightsPanel visits={visits} />
              </Suspense>
            ) : (
              <>
                {topOrders.length > 0 && (
                  <section className="paper-card p-6 sm:p-7 mb-6">
                    <h2 className="eyebrow mb-4">Top orders</h2>
                    <div className="flex flex-wrap gap-2.5">
                      {topOrders.map(({ order, count }) => (
                        <span key={order} className="pill">
                          {order}
                          <span className="pill-count">{count}</span>
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {visits.some((v) => v.coffee_shop_lat) && (
                  <section className="paper-card p-6 sm:p-7 mb-6">
                    <h2 className="eyebrow mb-4">Map</h2>
                    <div
                      className="h-64 sm:h-80 lg:h-96 rounded-3xl overflow-hidden"
                      style={{ isolation: 'isolate' }}
                    >
                      <LazyMount
                        rootMargin="300px"
                        placeholder={
                          <div className="h-full flex items-center justify-center text-stone-500 dark:text-stone-400 text-sm">
                            Map loads when in view
                          </div>
                        }
                      >
                        <Suspense
                          fallback={
                            <div className="h-full flex items-center justify-center text-stone-500 dark:text-stone-400 text-sm animate-pulse">
                              Loading map...
                            </div>
                          }
                        >
                          <VisitsMap visits={visits} onVisitClick={setViewingVisit} />
                        </Suspense>
                      </LazyMount>
                    </div>
                  </section>
                )}

                <VisitsToolbar
                  ref={searchRef}
                  totalCount={visits.length}
                  filteredCount={sortedVisits.length}
                  hasActiveFilters={hasActiveFilters}
                  sortBy={sortBy}
                  sortAsc={sortAsc}
                  onSortByChange={setSortBy}
                  sportFilter={sportFilter}
                  onSportChange={setSportFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                <VisitList
                  visits={sortedVisits}
                  loading={loading}
                  onEdit={handleEditVisit}
                  onDelete={handleDeleteVisit}
                  onViewDetails={setViewingVisit}
                  onAddVisit={() => setShowForm(true)}
                  hasActiveFilters={hasActiveFilters}
                  shopVisitCounts={shopCounts}
                />
              </>
            )}
          </main>
        )}

        {!loading && (
          <footer
            className={`mt-16 py-10 text-center transition-colors ${
              appMode === APP_MODES.VEST
                ? 'border-t border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm'
                : ''
            }`}
          >
            {isVibes ? (
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                Built for logging AJ Harrison's road coffee orders
              </p>
            ) : (
              <p>Built for charting AJ's sideline fits and results</p>
            )}
          </footer>
        )}

        {isVibes && !showForm && !editingVisit && (
          <button
            onClick={() => setShowForm(true)}
            className="fab-press fixed right-5 md:right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-50"
            style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
            aria-label="Add Visit"
          >
            <svg className="w-7 h-7 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {viewingVisit && (
          <Suspense fallback={null}>
            <VisitDetailModal
              visit={viewingVisit}
              visits={sortedVisits}
              onClose={() => setViewingVisit(null)}
              onNavigate={setViewingVisit}
              onUpdate={handleModalUpdateVisit}
              onEdit={handleEditVisit}
              onDelete={handleDeleteVisit}
              onDuplicate={handleDuplicateVisit}
            />
          </Suspense>
        )}

        {isVibes && showForm && (
          <FormModal title="Add Visit" onClose={handleCancelForm}>
            <AddVisitForm onSubmit={handleAddVisit} onCancel={handleCancelForm} visits={visits} />
          </FormModal>
        )}

        {isVibes && editingVisit && (
          <FormModal title="Edit Visit" onClose={handleCancelForm}>
            <AddVisitForm
              initialData={editingVisit}
              onSubmit={handleUpdateVisit}
              onCancel={handleCancelForm}
              visits={visits}
            />
          </FormModal>
        )}

        <Toast bag={toastBag} />

        {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

        {showYearReview && (
          <Suspense fallback={null}>
            <YearInReview visits={visits} onClose={() => setShowYearReview(false)} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
