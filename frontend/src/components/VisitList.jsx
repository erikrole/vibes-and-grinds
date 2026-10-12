import VisitCard from './VisitCard';
import { getShopRepeatKey } from '../utils/repeats';

export default function VisitList({
  visits,
  loading,
  onEdit,
  onDelete,
  onViewDetails,
  onAddVisit,
  onLogReturnVisit,
  hasActiveFilters = false,
  shopVisitCounts = {},
}) {
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
                <div className="h-7 bg-surface-muted rounded w-1/2" />
                <div className="h-4 bg-surface-muted rounded w-1/3" />
                <div className="h-4 bg-surface-muted rounded w-2/3 mt-4" />
                <div className="h-4 bg-surface-muted rounded w-1/2" />
              </div>
              <div className="flex gap-3">
                <div className="h-20 w-16 bg-surface-muted rounded-lg" />
                <div className="h-20 w-16 bg-surface-muted rounded-lg" />
                <div className="h-20 w-20 bg-surface-muted rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-ink-soft mb-2">
          {hasActiveFilters ? 'No matching visits' : 'No visits yet'}
        </h3>
        <p className="text-ink-soft mb-6">
          {hasActiveFilters ? 'Try a different search or remove filters.' : 'Add a shop, your order, and your ratings.'}
        </p>
        {!hasActiveFilters && onAddVisit && (
          <button onClick={onAddVisit} className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add a visit
          </button>
        )}
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
            onLogReturnVisit={onLogReturnVisit}
            visitCount={shopVisitCounts[getShopRepeatKey(visit)] || 1}
          />
      ))}
    </div>
  );
}
