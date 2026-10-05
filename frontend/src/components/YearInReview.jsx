import { useEffect, useMemo, useRef, useState } from 'react';
import { computeSeasonReview, getAvailableSeasons } from '../utils/yearReview';
import { formatDate } from '../utils/dates';
import useFocusTrap from '../hooks/useFocusTrap';

export default function YearInReview({ visits, initialSeason, onSeasonChange, onVisitClick, onClose }) {
  const seasons = useMemo(() => getAvailableSeasons(visits), [visits]);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason || seasons[0]);
  const review = useMemo(() => computeSeasonReview(visits, selectedSeason), [visits, selectedSeason]);
  const ref = useRef(null);
  const closeRef = useRef(null);
  useFocusTrap(ref, { onEscape: onClose, initialFocusRef: closeRef });
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);
  return <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="Road season review">
    <div className="dialog-backdrop" onClick={onClose} />
    <div className="dialog-positioner"><section ref={ref} className="dialog-panel season-review max-w-4xl">
      <header className="season-review-header"><div><p className="eyebrow">Road seasons</p><h2>{selectedSeason} {review?.complete ? 'season review' : 'season so far'}</h2></div>
        <div className="flex items-center gap-3"><label><span className="sr-only">Season</span><select className="control-field" value={selectedSeason} onChange={(event) => { setSelectedSeason(event.target.value); onSeasonChange(event.target.value); }}>{seasons.map((season) => <option key={season}>{season}</option>)}</select></label><button type="button" ref={closeRef} className="header-icon-button" onClick={onClose} aria-label="Close season review">×</button></div>
      </header>
      {!review ? <p className="type-meta">No road visits in this season.</p> : <>
        <p className="type-meta mb-6">{review.dateRange}. Road trips only; stops around Madison are in the journal.</p>
        <div className="season-counts"><p><strong>{review.totalVisits}</strong> {review.totalVisits === 1 ? 'visit' : 'visits'}</p><p><strong>{review.uniqueShops}</strong> {review.uniqueShops === 1 ? 'shop' : 'shops'}</p><p><strong>{review.uniqueCities}</strong> {review.uniqueCities === 1 ? 'city' : 'cities'}</p></div>
        <dl className="shop-history-stats"><div><dt>Average vibe</dt><dd>{review.avgVibe.toFixed(1)}<small> / 10</small></dd></div><div><dt>Average coffee</dt><dd>{review.avgCoffee.toFixed(1)}<small> / 10</small></dd></div><div><dt>Average overall</dt><dd>{review.avgComposite.toFixed(1)}<small> / 20</small></dd></div></dl>
        <section className="season-stop-grid">
          <button type="button" className="season-stop text-left" onClick={() => onVisitClick(review.bestVisit)}><p className="eyebrow">{review.totalVisits === 1 ? 'Only stop logged' : 'Highest rated stop'}</p>{review.bestVisit.photo_url && <img src={review.bestVisit.photo_url} alt="" />}<h3>{review.bestVisit.coffee_shop_name}</h3><p>{review.bestVisit.city} · {Number(review.bestVisit.composite_score).toFixed(1)} / 20</p><p>{formatDate(review.bestVisit.date)}</p></button>
          {review.mostVisitedShop && <button type="button" className="season-stop text-left" onClick={() => onVisitClick(review.mostVisitedShop.visit)}><p className="eyebrow">Most return visits</p><h3>{review.mostVisitedShop.name}</h3><p>{review.mostVisitedShop.count} visits this season</p></button>}
        </section>
        <div className="season-facts"><p>{review.newShops} {review.newShops === 1 ? 'shop first visited' : 'shops first visited'} in this season.</p><p>{review.totalPhotos} {review.totalPhotos === 1 ? 'visit has a photo' : 'visits have photos'}.</p>{review.totalVisits === 1 && <p>More comparisons will appear as visits are added.</p>}</div>
        <section className="season-months"><h3>Visits by month</h3><ol>{review.monthlyBreakdown.map((month) => <li key={month.month}><span>{month.month}</span><b>{month.count}</b><span className="season-month-bar" aria-hidden="true" style={{ width: `${month.count / Math.max(...review.monthlyBreakdown.map((item) => item.count), 1) * 100}%` }} /></li>)}</ol></section>
        {review.totalVisits > 1 && <div className="season-bookends"><p>First recorded: {review.firstVisit.coffee_shop_name} · {formatDate(review.firstVisit.date)}</p><p>{review.complete ? 'Last recorded' : 'Latest recorded'}: {review.lastVisit.coffee_shop_name} · {formatDate(review.lastVisit.date)}</p></div>}
      </>}
    </section></div>
  </div>;
}
