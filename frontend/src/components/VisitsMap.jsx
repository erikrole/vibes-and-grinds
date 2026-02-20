import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const coffeeIcon = L.divIcon({
  html: '☕',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

export default function VisitsMap({ visits, onVisitClick }) {
  const visitsWithCoords = useMemo(() => {
    return visits.filter(
      (visit) =>
        Number.isFinite(Number(visit.coffee_shop_lat)) &&
        Number.isFinite(Number(visit.coffee_shop_lng))
    );
  }, [visits]);

  const center = useMemo(() => {
    if (visitsWithCoords.length === 0) {
      return [39.8283, -98.5795]; // Center of USA
    }

    const avgLat =
      visitsWithCoords.reduce((sum, v) => sum + Number(v.coffee_shop_lat), 0) / visitsWithCoords.length;
    const avgLng =
      visitsWithCoords.reduce((sum, v) => sum + Number(v.coffee_shop_lng), 0) / visitsWithCoords.length;

    return [avgLat, avgLng];
  }, [visitsWithCoords]);

  const zoom = useMemo(() => {
    if (visitsWithCoords.length === 0) return 4;
    if (visitsWithCoords.length === 1) return 13;

    // Calculate bounds and determine appropriate zoom
    const lats = visitsWithCoords.map((v) => Number(v.coffee_shop_lat));
    const lngs = visitsWithCoords.map((v) => Number(v.coffee_shop_lng));
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread < 0.1) return 12;
    if (maxSpread < 0.5) return 10;
    if (maxSpread < 2) return 8;
    if (maxSpread < 5) return 7;
    if (maxSpread < 10) return 6;
    return 5;
  }, [visitsWithCoords]);

  if (visitsWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-100 dark:bg-stone-700 rounded-xl p-8">
        <p className="text-stone-500 dark:text-stone-400 text-center">
          No visits with location data yet.
          <br />
          <span className="text-sm">Add visits with Google Places autocomplete to see them on the map.</span>
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-xl"
      scrollWheelZoom={true}
      key={`map-${visitsWithCoords.length}-${center.join(',')}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {visitsWithCoords.map((visit) => (
        <Marker
          key={visit.id}
          position={[Number(visit.coffee_shop_lat), Number(visit.coffee_shop_lng)]}
          icon={coffeeIcon}
          eventHandlers={{
            click: () => onVisitClick?.(visit),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-stone-900">{visit.coffee_shop_name}</p>
              {visit.city && <p className="text-xs text-stone-600">{visit.city}</p>}
              <div className="flex gap-2 mt-1">
                <span className="text-xs font-medium">Vibe: {visit.vibe_rating}</span>
                <span className="text-xs font-medium">Coffee: {visit.coffee_rating}</span>
                <span className="text-xs font-medium">Total: {visit.composite_score}</span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
