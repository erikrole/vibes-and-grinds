import { useEffect, useMemo, useState } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import VisitDetailModal from './components/VisitDetailModal';
import DarkModeProvider from './contexts/DarkModeContext';
import DarkModeToggle from './components/DarkModeToggle';
import FormModal from './components/FormModal';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from './utils/api';

const VIEW_PREFERENCES_KEY = 'vibes-and-grinds:view-preferences';

const QUICK_FILTERS = [
  { key: 'coffee8', label: '☕ 8+ Coffee' },
  { key: 'vibe8', label: '✨ 8+ Vibe' },
  { key: 'basketball', label: '🏀 Men\'s Basketball' },
  { key: 'hasPhoto', label: '📍 Has photo' },
];

const DEFAULT_QUICK_FILTERS = {
  coffee8: false,
  vibe8: false,
  basketball: false,
  hasPhoto: false,
};

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [viewingVisit, setViewingVisit] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [quickFilters, setQuickFilters] = useState(DEFAULT_QUICK_FILTERS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEW_PREFERENCES_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed.sortBy) setSortBy(parsed.sortBy);
      if (typeof parsed.searchQuery === 'string') setSearchQuery(parsed.searchQuery);
      if (typeof parsed.sportFilter === 'string') setSportFilter(parsed.sportFilter);
      if (parsed.quickFilters && typeof parsed.quickFilters === 'object') {
        setQuickFilters((prev) => ({ ...prev, ...parsed.quickFilters }));
      }
    } catch (storageError) {
      console.warn('Failed to restore view preferences', storageError);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      VIEW_PREFERENCES_KEY,
      JSON.stringify({
        sortBy,
        searchQuery,
        sportFilter,
        quickFilters,
      })
    );
  }, [sortBy, searchQuery, sportFilter, quickFilters]);

  useEffect(() => {
    loadVisits();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchVisits();
      setVisits(data);
    } catch (err) {
      setError('Failed to load visits. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVisit = async (visitData) => {
    try {
      setError(null);
      const newVisit = await createVisit(visitData);
      setVisits((prev) => [newVisit, ...prev]);
      setShowForm(false);
      showToast('Visit added.');
    } catch (err) {
      setError('Failed to add visit. Please try again.');
      showToast('Could not add visit.', 'error');
      console.error(err);
    }
  };

  const handleEditVisit = (visit) => {
    setEditingVisit(visit);
    setShowForm(false);
    setViewingVisit(null);
  };

  const handleUpdateVisit = async (visitData) => {
    try {
      setError(null);
      const updatedVisit = await updateVisit(editingVisit.id, visitData);
      setVisits((prev) => prev.map((v) => (v.id === editingVisit.id ? updatedVisit : v)));
      setEditingVisit(null);
      showToast('Visit updated.');
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      showToast('Could not update visit.', 'error');
      console.error(err);
    }
  };

  const handleDeleteVisit = async (id) => {
    try {
      setError(null);
      await deleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
      setViewingVisit((prev) => (prev?.id === id ? null : prev));
      showToast('Visit deleted.');
    } catch (err) {
      setError('Failed to delete visit. Please try again.');
      showToast('Could not delete visit.', 'error');
      console.error(err);
    }
  };

  const handleDuplicateVisit = async (visit) => {
    const duplicatedPayload = {
      ...visit,
      id: undefined,
      date: getTodayDateString(),
      notes: visit.notes ? `${visit.notes} (dup)` : '',
    };

    try {
      setError(null);
      const duplicated = await createVisit(duplicatedPayload);
      setVisits((prev) => [duplicated, ...prev]);
      setViewingVisit(null);
      showToast('Visit duplicated for today.');
    } catch (err) {
      setError('Failed to duplicate visit. Please try again.');
      showToast('Could not duplicate visit.', 'error');
      console.error(err);
    }
  };

  const handleModalUpdateVisit = async (id, updatedData) => {
    try {
      setError(null);
      const updatedVisit = await updateVisit(id, updatedData);
      setVisits((prev) => prev.map((visit) => (visit.id === id ? updatedVisit : visit)));
      setViewingVisit(updatedVisit);
      showToast('Visit updated.');
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      showToast('Could not update visit.', 'error');
      console.error(err);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingVisit(null);
  };

  const handleHeaderHomeClick = () => {
    window.location.assign('/');
  };

  const toggleQuickFilter = (key) => {
    setQuickFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const activeQuickFilterCount = Object.values(quickFilters).filter(Boolean).length;

  const filteredVisits = visits.filter((visit) => {
    if (sportFilter && visit.sport !== sportFilter) {
      return false;
    }

    if (quickFilters.basketball && visit.sport !== "Men's Basketball") {
      return false;
    }

    if (quickFilters.coffee8 && Number(visit.coffee_rating) < 8) {
      return false;
    }

    if (quickFilters.vibe8 && Number(visit.vibe_rating) < 8) {
      return false;
    }

    if (quickFilters.hasPhoto && !visit.photo_url) {
      return false;
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    return (
      visit.coffee_shop_name.toLowerCase().includes(query) ||
      visit.city?.toLowerCase().includes(query) ||
      visit.opponent?.toLowerCase().includes(query) ||
      visit.coffee_order?.toLowerCase().includes(query)
    );
  });

  const sortedVisits = [...filteredVisits].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date) - new Date(a.date);
      case 'vibe':
        return b.vibe_rating - a.vibe_rating;
      case 'coffee':
        return b.coffee_rating - a.coffee_rating;
      case 'composite':
        return b.composite_score - a.composite_score;
      default:
        return 0;
    }
  });

  const hasActiveFilters = Boolean(searchQuery || sportFilter || activeQuickFilterCount > 0);

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

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-200">
        <header className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-center justify-between">
              <button
                onClick={handleHeaderHomeClick}
                className="flex items-center gap-3 sm:gap-4 text-left hover:opacity-80 transition-opacity"
                aria-label="Go to homepage"
                title="Go home"
              >
                <div className="text-3xl sm:text-4xl">☕</div>
                <h1 className="coffee-shop-name text-3xl sm:text-4xl font-black tracking-tight">Vibes & Grinds</h1>
              </button>
              {!showForm && !editingVisit && (
                <button onClick={() => setShowForm(true)} className="btn-primary hidden md:block">
                  Add Visit
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-5 py-4 rounded-md transition-colors">
              {error}
            </div>
          )}

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SnapshotCard label="Total Visits" value={visits.length} />
            <SnapshotCard label="Avg Vibe" value={avgVibe} />
            <SnapshotCard label="Avg Coffee" value={avgCoffee} />
            <SnapshotCard label="Avg Total" value={`${avgComposite} / 20`} />
          </section>

          <section className="mb-6 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-4 sm:p-5 transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-50 mb-1 transition-colors">Visits</h2>
                {hasActiveFilters ? (
                  <p className="text-stone-500 dark:text-stone-400 text-sm tracking-wide transition-colors">
                    Showing {sortedVisits.length} of {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                  </p>
                ) : (
                  <p className="text-stone-500 dark:text-stone-400 text-sm tracking-wide transition-colors">
                    {visits.length} total {visits.length === 1 ? 'visit' : 'visits'}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:justify-end">
                <div className="inline-flex rounded-md border border-stone-300 dark:border-stone-600 overflow-hidden">
                  {[
                    { value: 'date', label: 'Date' },
                    { value: 'vibe', label: 'Vibe' },
                    { value: 'coffee', label: 'Coffee' },
                    { value: 'composite', label: 'Total' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`px-3 py-2 text-sm transition-colors border-r last:border-r-0 border-stone-300 dark:border-stone-600 ${
                        sortBy === option.value
                          ? 'bg-stone-800 dark:bg-stone-700 text-stone-50'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                      }`}
                      aria-pressed={sortBy === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 cursor-pointer transition-colors min-w-[180px]"
                >
                  <option value="">All sports</option>
                  <option value="Men's Basketball">Men's Basketball</option>
                  <option value="Football">Football</option>
                  <option value="Track & Field">Track & Field</option>
                  <option value="Cross Country">Cross Country</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => {
                const isActive = quickFilters[filter.key];

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => toggleQuickFilter(filter.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isActive
                        ? 'bg-stone-800 text-stone-50 border-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                        : 'bg-white text-stone-600 border-stone-300 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                    aria-pressed={isActive}
                  >
                    {filter.label}
                  </button>
                );
              })}
              {activeQuickFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickFilters({ ...DEFAULT_QUICK_FILTERS })}
                  className="px-3 py-1.5 rounded-full text-sm border border-red-200 text-red-600 dark:border-red-400/40 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Clear quick filters
                </button>
              )}
            </div>

            <div className="relative mt-4">
              <input
                type="text"
                placeholder="Search by shop name, city, opponent, or order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 transition-colors"
              />
              <svg
                className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </section>

          <VisitList
            visits={sortedVisits}
            loading={loading}
            onEdit={handleEditVisit}
            onDelete={handleDeleteVisit}
            onViewDetails={setViewingVisit}
            hasActiveFilters={hasActiveFilters}
          />
        </main>

        <footer className="mt-20 py-8 text-center text-stone-400 dark:text-stone-500 text-sm tracking-wide border-t border-stone-200 dark:border-stone-700 transition-colors">
          <p>Built for logging AJ Harrison's road coffee orders</p>
        </footer>

        {!showForm && !editingVisit && (
          <button
            onClick={() => setShowForm(true)}
            className="fixed bottom-5 right-5 md:bottom-6 md:right-6 w-16 h-16 md:w-14 md:h-14 bg-stone-800 dark:bg-stone-700 text-stone-50 rounded-full shadow-lg hover:bg-stone-900 dark:hover:bg-stone-600 transition-all flex items-center justify-center z-50 hover:scale-110 active:scale-95"
            aria-label="Add Visit"
          >
            <svg className="w-7 h-7 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {viewingVisit && (
          <VisitDetailModal
            visit={viewingVisit}
            visits={visits}
            onClose={() => setViewingVisit(null)}
            onUpdate={handleModalUpdateVisit}
            onEdit={handleEditVisit}
            onDelete={handleDeleteVisit}
            onDuplicate={handleDuplicateVisit}
          />
        )}

        {showForm && (
          <FormModal title="Add Visit" onClose={handleCancelForm}>
            <AddVisitForm onSubmit={handleAddVisit} onCancel={handleCancelForm} visits={visits} />
          </FormModal>
        )}

        {editingVisit && (
          <FormModal title="Edit Visit" onClose={handleCancelForm}>
            <AddVisitForm initialData={editingVisit} onSubmit={handleUpdateVisit} onCancel={handleCancelForm} visits={visits} />
          </FormModal>
        )}

        {toast && (
          <div className="fixed top-4 right-4 z-[70]">
            <div
              className={`px-4 py-3 rounded-lg shadow-lg border text-sm ${
                toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200'
              }`}
            >
              {toast.message}
            </div>
          </div>
        )}

        <DarkModeToggle />
      </div>
    </DarkModeProvider>
  );
}

function SnapshotCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-4 transition-colors">
      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 mt-1">{value}</p>
    </div>
  );
}
