import { useMemo, useState } from 'react';
import VisitsMap from './VisitsMap';
import { titleCaseOrder } from '../utils/display';
import { getAppleMapsUrl } from '../utils/maps';
import { hasVisitCoordinates } from '../utils/coords';
import { getShopRepeatKey } from '../utils/repeats';

export default function MapExplorer({ visits, onVisitClick, onShopClick, onRepair }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [missingOnly, setMissingOnly] = useState(false);
  const cities = useMemo(() => [...new Set(visits.map((visit) => visit.city).filter(Boolean))].sort(), [visits]);
  const groups = useMemo(() => {
    const shops = new Map();
    [...visits].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).forEach((visit) => {
      const key = getShopRepeatKey(visit);
      if (!shops.has(key)) shops.set(key, { key, latest: visit, visits: [], pin: null });
      const shop = shops.get(key);
      shop.visits.push(visit);
      if (!shop.pin && hasVisitCoordinates(visit)) shop.pin = visit;
    });
    return [...shops.values()];
  }, [visits]);
  const visible = groups.filter((shop) => (!city || shop.latest.city === city)
    && (!missingOnly || shop.visits.some((visit) => !hasVisitCoordinates(visit)))
    && shop.visits.some((visit) => `${visit.coffee_shop_name} ${visit.city || ''} ${visit.coffee_order || ''}`.toLowerCase().includes(query.trim().toLowerCase())));
  const pins = visible.map((shop) => shop.pin).filter(Boolean);
  const missing = visits.filter((visit) => !hasVisitCoordinates(visit));
  const selected = visible.find((shop) => shop.key === selectedKey);
  const repairVisit = selected?.visits.find((visit) => !hasVisitCoordinates(visit));
  const select = (visit) => setSelectedKey(getShopRepeatKey(visit));
  return <section className="map-explorer">
    <header className="section-intro map-explorer-header">
      <div><h2>Coffee map</h2><p>{pins.length} {pins.length === 1 ? 'shop' : 'shops'} on the map. Select a shop to see its visits.</p>
        {missing.length > 0 && <div className="map-repair-note">{onRepair ? <button type="button" className="text-action" aria-pressed={missingOnly} onClick={() => { setMissingOnly((value) => !value); setCity(''); setQuery(''); }}>{missingOnly ? 'Show all shops' : `Fix ${missing.length} missing locations`}</button> : <span>{missing.length} visits still need a location.</span>}</div>}
      </div>
      <div className="map-filters"><input className="control-field" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a shop or order" aria-label="Search shops on map" /><select className="control-field" value={city} onChange={(event) => setCity(event.target.value)} aria-label="Filter map by city"><option value="">All cities</option>{cities.map((name) => <option value={name} key={name}>{name}</option>)}</select></div>
    </header>
    <div className="map-explorer-layout">
      <div className="map-canvas"><VisitsMap visits={pins} selectedVisitId={selected?.pin?.id} onVisitSelect={select} onVisitClick={onVisitClick} /></div>
      <div className="map-result-list" aria-label="Coffee shops">
        {selected && <div className="map-selection"><strong>{selected.latest.coffee_shop_name}</strong><p>{selected.latest.city} · {selected.visits.length} {selected.visits.length === 1 ? 'visit' : 'visits'}</p>
          <div className="map-selection-actions"><button type="button" className="btn-primary" onClick={() => selected.latest.shop_id ? onShopClick(selected.latest) : onVisitClick(selected.latest)}>Visit history</button><a className="text-action" href={getAppleMapsUrl(selected.pin || selected.latest)} target="_blank" rel="noopener noreferrer">Apple Maps ↗</a>{repairVisit && onRepair && <button type="button" className="text-action" onClick={() => onRepair(repairVisit)}>Add missing location</button>}</div>
        </div>}
        {visible.map((shop) => <button key={shop.key} type="button" className="map-result" aria-current={selectedKey === shop.key ? 'true' : undefined} onClick={() => setSelectedKey(shop.key)}>
          <span><strong>{shop.latest.coffee_shop_name}</strong><small>{shop.latest.city} · {shop.visits.length} {shop.visits.length === 1 ? 'visit' : 'visits'}{shop.pin ? '' : ' · Not on map'}</small><small>{titleCaseOrder(shop.latest.coffee_order)}</small></span><b>{Number(shop.latest.composite_score).toFixed(1)}<small>Latest /20</small></b>
        </button>)}
        {!visible.length && <p className="compare-empty">No shops match those filters.</p>}
      </div>
    </div>
  </section>;
}
