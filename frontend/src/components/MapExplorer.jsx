import { useMemo, useState } from 'react';
import VisitsMap from './VisitsMap';
import { titleCaseOrder } from '../utils/display';
import { getAppleMapsUrl } from '../utils/maps';
import { hasVisitCoordinates } from '../utils/coords';

// Flags visits the map can't pin, so a row that never highlights isn't a mystery.
function describeVisit(visit) {
  const parts = [
    visit.city,
    visit.coffee_order ? titleCaseOrder(visit.coffee_order) : null,
    hasVisitCoordinates(visit) ? null : 'Not on map',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Location saved';
}

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

  // Visits typed by hand have no coordinates, so they're listed but not pinned.
  const mappedCount = useMemo(() => visibleVisits.filter(hasVisitCoordinates).length, [visibleVisits]);
  const unmappedCount = visibleVisits.length - mappedCount;
  const selectedVisit = visibleVisits.find((visit) => visit.id === selectedVisitId);

  const selectVisit = (visit) => setSelectedVisitId(visit.id);
  const openVisit = (visit) => {
    setSelectedVisitId(visit.id);
    onVisitClick?.(visit);
  };

  return (
    <section className="map-explorer">
      <header className="section-intro map-explorer-header">
        <div><h2>Coffee map</h2><p>{mappedCount} mapped {mappedCount === 1 ? 'visit' : 'visits'}{unmappedCount > 0 ? ` · ${unmappedCount} without a location` : ''}. Select a stop to open its entry.</p></div>
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
        <div className="map-result-list" aria-label="Coffee stops">
          {selectedVisit && <div className="map-selection">
            <strong>{selectedVisit.coffee_shop_name}</strong><p>{describeVisit(selectedVisit)}</p>
            <div className="map-selection-actions"><button type="button" className="btn-primary" onClick={() => openVisit(selectedVisit)}>Open entry</button><a className="text-action" href={getAppleMapsUrl(selectedVisit)} target="_blank" rel="noopener noreferrer">Apple Maps ↗</a></div>
          </div>}
          {visibleVisits.map((visit) => (
            <button key={visit.id} type="button" className="map-result" aria-current={selectedVisitId === visit.id ? 'true' : undefined} onFocus={() => selectVisit(visit)} onClick={() => selectVisit(visit)}>
              <span><strong>{visit.coffee_shop_name}</strong><small>{describeVisit(visit)}</small></span>
              <b>{Number(visit.composite_score).toFixed(1)}</b>
            </button>
          ))}
          {!visibleVisits.length && <p className="compare-empty">No coffee stops match those filters.</p>}
        </div>
      </div>
    </section>
  );
}
