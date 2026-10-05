import { useMemo, useState } from 'react';
import { titleCaseOrder } from '../utils/display';
import { formatDate } from '../utils/dates';

import { buildComparisons } from '../utils/comparisons';

export default function InsightsPanel({ visits, onVisitClick, onShopClick }) {
  const [groupBy, setGroupBy] = useState('shop');
  const [minVisits, setMinVisits] = useState(1);
  const [rankBy, setRankBy] = useState('coffee_rating');
  const [city, setCity] = useState('');
  const cities = [...new Set(visits.map((visit) => visit.city).filter(Boolean))].sort();
  const source = city ? visits.filter((visit) => visit.city === city) : visits;
  const comparisons = useMemo(() => buildComparisons(source, groupBy, minVisits, rankBy), [visits, city, groupBy, minVisits, rankBy]);
  const best = source.reduce((winner, visit) => !winner || Number(visit.coffee_rating) > Number(winner.coffee_rating) ? visit : winner, null);
  const repeatGroups = buildComparisons(source, 'shop', 2);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const detail = comparisons.find((item) => item.key === selectedGroup);
  if (!visits.length) return <p className="empty-state">Ratings and comparisons will appear after the first visit.</p>;
  return <div className="insights-workbench">
    <header className="section-intro"><h2>Find a good cup</h2><p>Compare the places and orders in AJ’s journal. Each rating is a personal take.</p></header>
    <section className="insight-highlight-grid useful-highlights" aria-label="Journal highlights">
      {best && <button type="button" className="insight-highlight text-left" onClick={() => onVisitClick(best)}><p className="eyebrow">Highest coffee rating{city ? ` · ${city}` : ''}</p><h3>{best.coffee_shop_name}</h3><p>{titleCaseOrder(best.coffee_order)} · {Number(best.coffee_rating).toFixed(1)} / 10</p></button>}
      <article className="insight-highlight"><p className="eyebrow">Return visits</p><h3>{repeatGroups.length} {repeatGroups.length === 1 ? 'shop revisited' : 'shops revisited'}</h3><p>{repeatGroups.length ? 'Open a shop below to compare its visits.' : 'Repeat comparisons will appear when a shop has a second visit.'}</p></article>
    </section>
    <section className="compare-panel">
      <div className="compare-heading"><h3>Compare ratings</h3><div className="compare-controls">
        <label>Compare<select value={groupBy} onChange={(event) => { setGroupBy(event.target.value); setSelectedGroup(null); }} className="control-field"><option value="shop">Shops</option><option value="city">Cities</option><option value="order">Orders</option></select></label>
        <label>City<select value={city} onChange={(event) => { setCity(event.target.value); setSelectedGroup(null); }} className="control-field"><option value="">All cities</option>{cities.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Rank by<select value={rankBy} onChange={(event) => setRankBy(event.target.value)} className="control-field"><option value="coffee_rating">Coffee</option><option value="vibe_rating">Vibe</option><option value="composite_score">Overall</option></select></label>
        <label>Minimum visits<select value={minVisits} onChange={(event) => setMinVisits(Number(event.target.value))} className="control-field"><option value={1}>1 visit</option><option value={2}>2 visits</option><option value={3}>3 visits</option><option value={5}>5 visits</option></select></label>
      </div></div>
      <p className="comparison-explainer">Average ratings · vibe and coffee out of 10, overall out of 20. A single visit is one observation.</p>
      {comparisons.length ? <div className="comparison-scroll"><table className="ratings-table"><caption className="sr-only">Ratings grouped by {groupBy}, with visit counts</caption><thead><tr><th scope="col">{groupBy === 'shop' ? 'Shop' : groupBy === 'city' ? 'City' : 'Order'}</th><th scope="col">Visits</th><th scope="col">Vibe</th><th scope="col">Coffee</th><th scope="col">Overall</th></tr></thead><tbody>{comparisons.map((group) => <tr key={group.key}><th scope="row"><button type="button" className="comparison-link" onClick={() => groupBy === 'shop' && group.best.shop_id ? onShopClick(group.best) : setSelectedGroup(group.key)}>{group.label}<span className="sr-only"> — view visits</span></button>{groupBy === 'shop' && <small>{group.best.city}</small>}</th><td>{group.visits.length}</td><td>{group.vibe.toFixed(1)}</td><td>{group.coffee.toFixed(1)}</td><td><strong>{group.total.toFixed(1)}</strong></td></tr>)}</tbody></table></div> : <p className="compare-empty">No groups have {minVisits} visits yet. Choose a lower minimum.</p>}
      {detail && <section className="comparison-detail"><h4 className="text-lg font-semibold mb-3">Visits for {detail.label}</h4><ul>{detail.visits.map((visit) => <li key={visit.id}><button className="text-action text-left" onClick={() => onVisitClick(visit)}>{visit.coffee_shop_name} · {formatDate(visit.date)} · {titleCaseOrder(visit.coffee_order)} · {Number(visit.coffee_rating).toFixed(1)} coffee</button></li>)}</ul></section>}
    </section>
  </div>;
}
