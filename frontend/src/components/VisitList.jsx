import VisitCard from './VisitCard';

export default function VisitList({ visits, loading, onEdit, onDelete, onViewDetails }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-stone-700 dark:text-stone-300">Loading visits...</p>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">☕</div>
        <h3 className="text-xl font-semibold text-stone-700 dark:text-stone-300 mb-2">No visits yet</h3>
        <p className="text-stone-500 dark:text-stone-400">Start tracking your coffee shop adventures!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit) => (
        <VisitCard
          key={visit.id}
          visit={visit}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
