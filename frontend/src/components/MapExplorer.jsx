import { useMemo, useState } from 'react';
import VisitsMap from './VisitsMap';
import { titleCaseOrder } from '../utils/display';

export default function MapExplorer({ visits, onVisitClick }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState(null);

  const cities = useMemo(() => [...new Set(visits.map((visit) => visit.city).filter(Boolean))].sort(), [visits]);
  const visibleVisits = useMemo(() => visits.filter((visit) => {
    const matchesCity = !city || visit.city === city;
    const haystack = `${visit.coffee_shop_name} ${visit.city || ''} ${visit.coffee_order || ''}`.toLowerCase();
    return matchesCity && haystack.includes(query.trim().toLowerCase());
  }), [visits, query, city]);

  const selectVisit = (visit) => setSelectedVisitId(visit.id);
  const openVisit = (visit) => {
    setSelectedVisitId(visit.id);
    onVisitClick?.(visit);
  };

  return (
    <section className="map-explorer">
      <header className="section-intro map-explorer-header">
        <div><p className="eyebrow">On the road</p><h2>Map the coffee trail</h2><p>{visibleVisits.length} mapped visits. Select a stop for context, then open its full entry.</p></div>
        <div className="map-filters">
          <input className="control-field" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a shop or order" aria-label="Search mapped visits" />
          <select className="control-field" value={city} onChange={(event) => setCity(event.target.value)} aria-label="Filter map by city">
            <option value="">All cities</option>
            {cities.map((name) => <option value={name} key={name}>{name}</option>)}
          </select>
        </div>
      </header>
      <div className="map-explorer-layout">
        <div className="map-canvas">
          <VisitsMap visits={visibleVisits} selectedVisitId={selectedVisitId} onVisitSelect={selectVisit} onVisitClick={openVisit} />
        </div>
        <div className="map-result-list" aria-label="Mapped visits">
          {visibleVisits.map((visit) => (
            <button key={visit.id} type="button" className="map-result" aria-current={selectedVisitId === visit.id ? 'true' : undefined} onMouseEnter={() => selectVisit(visit)} onFocus={() => selectVisit(visit)} onClick={() => openVisit(visit)}>
              <span><strong>{visit.coffee_shop_name}</strong><small>{visit.city || 'Location saved'}{visit.coffee_order ? ` · ${titleCaseOrder(visit.coffee_order)}` : ''}</small></span>
              <b>{Number(visit.composite_score).toFixed(1)}</b>
            </button>
          ))}
          {!visibleVisits.length && <p className="compare-empty">No mapped visits match those filters.</p>}
        </div>
      </div>
    </section>
  );
}
