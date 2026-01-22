import { useState, useEffect } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from './utils/api';

export default function App() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVisits();
  }, []);

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
      setVisits([newVisit, ...visits]);
      setShowForm(false);
    } catch (err) {
      setError('Failed to add visit. Please try again.');
      console.error(err);
    }
  };

  const handleEditVisit = (visit) => {
    setEditingVisit(visit);
    setShowForm(false);
  };

  const handleUpdateVisit = async (visitData) => {
    try {
      setError(null);
      const updatedVisit = await updateVisit(editingVisit.id, visitData);
      setVisits(visits.map((v) => (v.id === editingVisit.id ? updatedVisit : v)));
      setEditingVisit(null);
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteVisit = async (id) => {
    try {
      setError(null);
      await deleteVisit(id);
      setVisits(visits.filter((v) => v.id !== id));
    } catch (err) {
      setError('Failed to delete visit. Please try again.');
      console.error(err);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingVisit(null);
  };

  // Filter by search query
  const filteredVisits = visits.filter((visit) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      visit.coffee_shop_name.toLowerCase().includes(query) ||
      visit.city?.toLowerCase().includes(query) ||
      visit.coffee_order?.toLowerCase().includes(query)
    );
  });

  // Sort filtered visits
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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">☕</div>
              <h1 className="text-4xl font-black tracking-tight text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Vibes & Grinds
              </h1>
            </div>
            {!showForm && !editingVisit && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Add Visit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-md">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-8">
            <AddVisitForm onSubmit={handleAddVisit} onCancel={handleCancelForm} />
          </div>
        )}

        {editingVisit && (
          <div className="mb-8">
            <AddVisitForm
              initialData={editingVisit}
              onSubmit={handleUpdateVisit}
              onCancel={handleCancelForm}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Coffee Shop Visits</h2>
                <p className="text-stone-600 text-sm tracking-wide">
                  {sortedVisits.length} of {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                  {searchQuery && ' (filtered)'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <span className="text-sm text-stone-500 hidden sm:block tracking-wide">Sort by:</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSortBy('date')}
                    className={`px-4 py-1.5 text-sm rounded transition-all ${
                      sortBy === 'date'
                        ? 'bg-stone-800 text-stone-50'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Date
                  </button>
                  <button
                    onClick={() => setSortBy('vibe')}
                    className={`px-4 py-1.5 text-sm rounded transition-all ${
                      sortBy === 'vibe'
                        ? 'bg-stone-800 text-stone-50'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Vibe
                  </button>
                  <button
                    onClick={() => setSortBy('coffee')}
                    className={`px-4 py-1.5 text-sm rounded transition-all ${
                      sortBy === 'coffee'
                        ? 'bg-stone-800 text-stone-50'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Coffee
                  </button>
                  <button
                    onClick={() => setSortBy('composite')}
                    className={`px-4 py-1.5 text-sm rounded transition-all ${
                      sortBy === 'composite'
                        ? 'bg-stone-800 text-stone-50'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Total
                  </button>
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by shop name, city, or order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
              />
              <svg
                className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400"
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
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
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
          </div>
        </div>

        <VisitList visits={sortedVisits} loading={loading} onEdit={handleEditVisit} onDelete={handleDeleteVisit} />
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 text-center text-stone-400 text-sm tracking-wide border-t border-stone-200">
        <p>Built for tracking coffee shop adventures</p>
      </footer>
    </div>
  );
}
