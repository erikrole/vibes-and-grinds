import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const coffeeIcon = L.divIcon({
  html: '<span style="font-size:32px;line-height:1;display:block;">☕</span>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export default function VisitsMap({ visits, onVisitClick }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const visitsWithCoords = useMemo(() => {
    return visits.filter(
      (visit) =>
        Number.isFinite(Number(visit.coffee_shop_lat)) &&
        Number.isFinite(Number(visit.coffee_shop_lng))
    );
  }, [visits]);

  const center = useMemo(() => {
    if (visitsWithCoords.length === 0) return [39.8283, -98.5795];
    const avgLat = visitsWithCoords.reduce((sum, v) => sum + Number(v.coffee_shop_lat), 0) / visitsWithCoords.length;
    const avgLng = visitsWithCoords.reduce((sum, v) => sum + Number(v.coffee_shop_lng), 0) / visitsWithCoords.length;
    return [avgLat, avgLng];
  }, [visitsWithCoords]);

  const zoom = useMemo(() => {
    if (visitsWithCoords.length === 0) return 4;
    if (visitsWithCoords.length === 1) return 13;
    const lats = visitsWithCoords.map((v) => Number(v.coffee_shop_lat));
    const lngs = visitsWithCoords.map((v) => Number(v.coffee_shop_lng));
    const maxSpread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
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
        url={tileUrl}
      />
      {visitsWithCoords.map((visit) => (
        <Marker
          key={visit.id}
          position={[Number(visit.coffee_shop_lat), Number(visit.coffee_shop_lng)]}
          icon={coffeeIcon}
          eventHandlers={{ click: () => onVisitClick?.(visit) }}
        />
      ))}
    </MapContainer>
  );
}
