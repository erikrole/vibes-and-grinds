import { useEffect, useMemo, useRef, useState } from 'react';
import { computeSeasonReview, getAvailableSeasons } from '../utils/yearReview';
import useFocusTrap from '../hooks/useFocusTrap';

export default function YearInReview({ visits, onClose }) {
  const seasons = useMemo(() => getAvailableSeasons(visits), [visits]);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || null);
  const review = useMemo(
    () => selectedSeason ? computeSeasonReview(visits, selectedSeason) : null,
    [visits, selectedSeason],
  );
  const reportRef = useRef(null);
  const closeRef = useRef(null);

  useFocusTrap(reportRef, { onEscape: onClose, initialFocusRef: closeRef });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  if (!review) {
    return (
      <div className="year-report-shell" role="dialog" aria-modal="true" aria-label="Season report">
        <div className="year-report-empty">
          <p>{selectedSeason ? `No visits in the ${selectedSeason} season` : 'No season data available'}</p>
          <button ref={closeRef} type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const maxMonth = Math.max(...review.monthlyBreakdown.map((month) => month.count), 1);
  const discoveryRate = Math.round((review.uniqueShops / review.totalVisits) * 100);

  return (
    <div className="year-report-shell" role="dialog" aria-modal="true" aria-label={`${review.season} coffee season report`}>
      <main ref={reportRef} className="year-report">
        <header className="year-report-nav">
          <div>
            <p className="year-report-kicker">Vibes &amp; Grinds</p>
            <p className="year-report-range">{review.dateRange}</p>
          </div>
          <div className="year-report-actions">
            <label>
              <span className="sr-only">Season</span>
              <select value={selectedSeason} onChange={(event) => setSelectedSeason(event.target.value)}>
                {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
              </select>
            </label>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close season report">×</button>
          </div>
        </header>

        <section className="year-report-hero">
          <p className="year-report-kicker">Your season in coffee</p>
          <h1><span>{review.totalVisits}</span> stops.<br />One road season.</h1>
          <p className="year-report-deck">A field report from {review.uniqueCities} cities, {review.uniqueShops} shops, and every cup in between.</p>
          <dl className="year-report-stat-row">
            <div><dt>Average score</dt><dd>{review.avgComposite}</dd></div>
            <div><dt>New-shop rate</dt><dd>{discoveryRate}%</dd></div>
            <div><dt>Photos kept</dt><dd>{review.totalPhotos}</dd></div>
          </dl>
        </section>

        <section className="year-report-grid">
          <article className="year-report-card year-report-best">
            <div className="year-report-card-copy">
              <p className="year-report-kicker">High point</p>
              <h2>{review.bestVisit.coffee_shop_name}</h2>
              <p>{review.bestVisit.city || 'On the road'} · {review.bestVisit.composite_score.toFixed(1)} / 20</p>
            </div>
            {review.bestVisit.photo_url && <img src={review.bestVisit.photo_url} alt={`Coffee at ${review.bestVisit.coffee_shop_name}`} />}
          </article>

          <article className="year-report-card year-report-persona">
            <p className="year-report-kicker">The read</p>
            <h2>{review.persona.name}</h2>
            <p>{review.persona.description}</p>
            <div className="year-report-rating-pair">
              <span>Vibe <b>{review.avgVibe}</b></span>
              <span>Coffee <b>{review.avgCoffee}</b></span>
            </div>
          </article>

          <article className="year-report-card year-report-favorites">
            <p className="year-report-kicker">Kept coming back</p>
            <h2>{review.mostVisitedShop.name}</h2>
            <p>{review.mostVisitedShop.count} visit{review.mostVisitedShop.count === 1 ? '' : 's'} this season</p>
            {review.topOrder && (
              <div className="year-report-order">
                <span>Most ordered</span>
                <strong>{review.topOrder.order}</strong>
                <small>{review.topOrder.count} time{review.topOrder.count === 1 ? '' : 's'}</small>
              </div>
            )}
          </article>
        </section>

        <section className="year-report-rhythm">
          <div>
            <p className="year-report-kicker">Season rhythm</p>
            <h2>{review.busiestMonth.month} carried the season.</h2>
          </div>
          <div className="year-report-chart" aria-label="Visits by month">
            {review.monthlyBreakdown.map((month) => (
              <div key={month.month} className="year-report-month">
                <span>{month.count || ''}</span>
                <i style={{ height: `${Math.max((month.count / maxMonth) * 100, 5)}%` }} />
                <small>{month.month}</small>
              </div>
            ))}
          </div>
        </section>

        <footer className="year-report-footer">
          <p>{review.dateRange}</p>
          <h2>{review.firstVisit.coffee_shop_name} started it.<br />{review.lastVisit.coffee_shop_name} closed it.</h2>
          <button type="button" onClick={onClose}>Back to the journal</button>
        </footer>
      </main>
    </div>
  );
}
