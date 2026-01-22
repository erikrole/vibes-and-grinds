import { useState, useEffect } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import { fetchVisits, createVisit } from './utils/api';

export default function App() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">☕</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Vibes & Grinds</h1>
                <p className="text-sm text-gray-500 mt-1">Basketball Road Trip Coffee Tracker</p>
              </div>
            </div>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                + Add Visit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-8">
            <AddVisitForm onSubmit={handleAddVisit} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coffee Shop Visits</h2>
          <p className="text-gray-600">
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'} logged
          </p>
        </div>

        <VisitList visits={visits} loading={loading} />
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-gray-500 text-sm">
        <p>Built for tracking coffee shop adventures on basketball road trips</p>
      </footer>
    </div>
  );
}
