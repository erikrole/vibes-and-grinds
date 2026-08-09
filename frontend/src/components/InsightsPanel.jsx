import { useMemo, useState } from 'react';
import { leaderboard, sportDayAnalysis, trendComparison, repeatShopInsights } from '../utils/insights';

const average = (items, key) => items.length
  ? items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length
  : 0;

const normalize = (value = '') => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function normalizedLeaderboard(visits, field, minVisits = 2) {
  const labels = new Map();
  visits.forEach((visit) => {
    const raw = visit[field]?.trim();
    const key = normalize(raw);
    if (key && !labels.has(key)) labels.set(key, raw);
  });
  return leaderboard(visits, (visit) => normalize(visit[field]), minVisits)
    .map((item) => ({ ...item, key: labels.get(item.key) || item.key }));
}

export default function InsightsPanel({ visits }) {
  const [compareBy, setCompareBy] = useState('coffee_shop_name');
  const [minimumSample, setMinimumSample] = useState(2);

  const recent = useMemo(
    () => [...visits].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
    [visits]
  );
  const previous = useMemo(
    () => [...visits].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(5, 10),
    [visits]
  );
  const comparisons = useMemo(
    () => normalizedLeaderboard(visits, compareBy, minimumSample).slice(0, 12),
    [visits, compareBy, minimumSample]
  );
  const sportDays = useMemo(() => sportDayAnalysis(visits), [visits]);
  const trend = useMemo(() => trendComparison(visits), [visits]);
  const repeat = useMemo(() => repeatShopInsights(visits), [visits]);
  const best = useMemo(
    () => visits.reduce((winner, visit) => !winner || visit.composite_score > winner.composite_score ? visit : winner, null),
    [visits]
  );

  if (!visits.length) return <p className="empty-state">Add a few visits to unlock patterns.</p>;

  const recentDelta = previous.length
    ? average(recent, 'composite_score') - average(previous, 'composite_score')
    : null;
  const ratingGap = average(visits, 'vibe_rating') - average(visits, 'coffee_rating');
  const returningShops = repeat?.shops?.length || 0;
  const historyDelta = trend ? trend.secondHalf.avgComposite - trend.firstHalf.avgComposite : null;

  return (
    <div className="insights-workbench">
      <header className="section-intro">
        <p className="eyebrow">Highlights</p>
        <h2>What the journal is saying</h2>
        <p>Patterns use the full history. Each comparison shows its sample size so a lucky one-off does not win.</p>
      </header>

      <section className="insight-highlight-grid" aria-label="Journal highlights">
        <Highlight
          label="Recent form"
          value={`${average(recent, 'composite_score').toFixed(1)}/20`}
          detail={recentDelta == null ? `Last ${recent.length} visits` : `${signed(recentDelta)} vs the previous ${previous.length}`}
        />
        <Highlight
          label="The balance"
          value={ratingGap >= 0 ? 'Vibe leads' : 'Coffee leads'}
          detail={`${Math.abs(ratingGap).toFixed(1)} points on average across ${visits.length} visits`}
        />
        <Highlight
          label="Best stop"
          value={best?.coffee_shop_name || 'Not enough data'}
          detail={best ? `${Number(best.composite_score).toFixed(1)}/20 in ${best.city || 'the journal'}` : ''}
        />
        <Highlight
          label="Regular rotation"
          value={`${returningShops} repeat ${returningShops === 1 ? 'shop' : 'shops'}`}
          detail={`${new Set(visits.map((visit) => normalize(visit.coffee_shop_name))).size} distinct shops logged`}
        />
      </section>

      <section className="insight-context-grid">
        <ContextCard title="Game-day effect">
          {sportDays ? (
            <>
              <strong>{signed(sportDays.gameDay.avgComposite - sportDays.nonGameDay.avgComposite)} overall</strong>
              <p>{sportDays.gameDay.count} game-day visits compared with {sportDays.nonGameDay.count} other road visits.</p>
            </>
          ) : <p>Log both game-day and non-game-day road stops to compare them.</p>}
        </ContextCard>
        <ContextCard title="Rating direction">
          {trend ? (
            <>
              <strong>{signed(historyDelta)} overall</strong>
              <p>Second half of the journal compared with the first half.</p>
            </>
          ) : <p>Four visits are needed before direction becomes meaningful.</p>}
        </ContextCard>
      </section>

      <section className="compare-panel">
        <div className="compare-heading">
          <div>
            <p className="eyebrow">Explore and compare</p>
            <h3>Rank like with like</h3>
          </div>
          <div className="compare-controls">
            <label>
              Compare
              <select value={compareBy} onChange={(event) => setCompareBy(event.target.value)} className="control-field">
                <option value="coffee_shop_name">Shops</option>
                <option value="city">Cities</option>
                <option value="coffee_order">Orders</option>
              </select>
            </label>
            <label>
              Minimum sample
              <select value={minimumSample} onChange={(event) => setMinimumSample(Number(event.target.value))} className="control-field">
                <option value={2}>2 visits</option>
                <option value={3}>3 visits</option>
                <option value={5}>5 visits</option>
              </select>
            </label>
          </div>
        </div>

        {comparisons.length ? (
          <div className="comparison-table" role="table" aria-label="Ranked journal comparison">
            <div className="comparison-row comparison-header" role="row">
              <span role="columnheader">Name</span><span role="columnheader">Sample</span><span role="columnheader">Vibe</span><span role="columnheader">Coffee</span><span role="columnheader">Overall</span>
            </div>
            {comparisons.map((item, index) => (
              <div className="comparison-row" role="row" key={item.key}>
                <span role="cell"><b>{index + 1}</b>{item.key}</span>
                <span role="cell">n={item.count}</span>
                <span role="cell">{item.avgVibe.toFixed(1)}</span>
                <span role="cell">{item.avgCoffee.toFixed(1)}</span>
                <strong role="cell">{item.avgComposite.toFixed(1)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="compare-empty">No groups meet that sample size yet. Lower the minimum or keep logging.</p>
        )}
      </section>
    </div>
  );
}

function Highlight({ label, value, detail }) {
  return <article className="insight-highlight"><p className="eyebrow">{label}</p><h3>{value}</h3><p>{detail}</p></article>;
}

function ContextCard({ title, children }) {
  return <article className="insight-context"><p className="eyebrow">{title}</p>{children}</article>;
}

function signed(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? '+' : ''}${number.toFixed(1)}`;
}
