import VisitCard from './VisitCard';

export default function VisitList({ visits, loading, onEdit, onDelete, onViewDetails, hasActiveFilters = false }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="card animate-pulse"
            aria-hidden="true"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="h-7 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mt-4" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
              </div>
              <div className="flex gap-3">
                <div className="h-20 w-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
                <div className="h-20 w-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
                <div className="h-20 w-20 bg-stone-200 dark:bg-stone-700 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">☕</div>
        <h3 className="text-xl font-semibold text-stone-700 dark:text-stone-300 mb-2">
          {hasActiveFilters ? 'No matching visits' : 'No visits yet'}
        </h3>
        <p className="text-stone-500 dark:text-stone-400">
          {hasActiveFilters ? 'Try a different search or remove filters.' : 'Start tracking your coffee shop adventures!'}
        </p>
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
