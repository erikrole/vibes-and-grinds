import { getRepeatVisits } from '../utils/repeats';
import { getAppleMapsUrl } from '../utils/maps';
import { formatDate } from '../utils/dates';
import VisitList from './VisitList';
import CopyLink from './CopyLink';

export default function ShopHistory({ shopId, visits, onBack, onVisitClick, onEdit, onDelete, onLogReturnVisit }) {
  const reference = visits.find((visit) => visit.shop_id === shopId);
  if (!reference) return <section className="supporting-panel"><h2>Shop not found</h2><p className="type-meta my-3">This shop has no published visits.</p><button className="text-action" onClick={onBack}>Back</button></section>;
  const history = getRepeatVisits(visits, reference).reverse();
  const latest = history[0];
  const best = history.reduce((winner, visit) => Number(visit.composite_score) > Number(winner.composite_score) ? visit : winner);
  const lowest = Math.min(...history.map((visit) => Number(visit.composite_score)));
  const average = history.reduce((sum, visit) => sum + Number(visit.composite_score), 0) / history.length;
  return <section className="shop-history">
    <button type="button" className="text-action mb-5" onClick={onBack}>← Back</button>
    <header className="shop-history-intro">
      <p className="eyebrow mb-2">Shop history · {history.length} {history.length === 1 ? 'visit' : 'visits'}</p>
      <h2>{latest.coffee_shop_name}</h2>
      <p className="type-meta mt-2">{latest.coffee_shop_address || latest.city}</p>
      <div className="flex gap-5 items-center flex-wrap mt-4"><a href={getAppleMapsUrl(latest)} target="_blank" rel="noopener noreferrer" className="text-action">Apple Maps ↗</a><CopyLink />{onLogReturnVisit && <button className="btn-primary" onClick={() => onLogReturnVisit(latest)}>Log return visit</button>}</div>
      <dl className="shop-history-stats">
        <div><dt>Latest</dt><dd>{Number(latest.composite_score).toFixed(1)}<small> / 20</small></dd><p>{formatDate(latest.date)}</p></div>
        <div><dt>Average</dt><dd>{average.toFixed(1)}<small> / 20</small></dd><p>{history.length} {history.length === 1 ? 'visit' : 'visits'}</p></div>
        <div><dt>Rating range</dt><dd>{lowest.toFixed(1)}–{Number(best.composite_score).toFixed(1)}</dd><p>Overall, out of 20</p></div>
      </dl>
    </header>
    <h3 className="text-lg font-semibold mb-4">All visits here</h3>
    <VisitList visits={history} onViewDetails={onVisitClick} onEdit={onEdit} onDelete={onDelete} onLogReturnVisit={onLogReturnVisit} />
  </section>;
}
