import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getMapsConfig, loadAppleMaps } from '../utils/mapkit';
import { getVisitCoordinates, hasVisitCoordinates } from '../utils/coords';
const LegacyVisitsMap = lazy(() => import('./LegacyVisitsMap'));

export default function VisitsMap({ visits, selectedVisitId, onVisitSelect, onVisitClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const annotationsRef = useRef([]);
  const callbacksRef = useRef({ onVisitSelect, onVisitClick });
  callbacksRef.current = { onVisitSelect, onVisitClick };
  const [provider, setProvider] = useState('loading');
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const located = useMemo(() => visits.filter(hasVisitCoordinates), [visits]);

  useEffect(() => {
    let cancelled = false;
    let observer;
    let map;
    setReady(false);
    setProvider('loading');
    (async () => {
      const { token } = await getMapsConfig();
      if (cancelled) return;
      if (!token) { setProvider('legacy'); return; }
      try {
        const kit = await loadAppleMaps();
        if (cancelled) return;
        map = new kit.Map(containerRef.current, { showsUserLocationControl: false });
        mapRef.current = map;
        const theme = () => { map.colorScheme = document.documentElement.classList.contains('dark') ? kit.ColorScheme.Dark : kit.ColorScheme.Light; };
        theme();
        observer = new MutationObserver(theme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        map.addEventListener('select', (event) => {
          const annotation = event.annotation || event.detail?.annotation;
          if (annotation?.data) callbacksRef.current.onVisitSelect?.(annotation.data);
        });
        setProvider('apple'); setReady(true);
      } catch { if (!cancelled) setProvider('error'); }
    })();
    return () => { cancelled = true; observer?.disconnect(); map?.destroy(); mapRef.current = null; };
  }, [retry]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kit = window.mapkit;
    const map = mapRef.current;
    map.removeAnnotations(annotationsRef.current);
    const annotations = located.map((visit) => {
      const { lat, lng } = getVisitCoordinates(visit);
      return new kit.MarkerAnnotation(new kit.Coordinate(lat, lng), {
        title: visit.coffee_shop_name, subtitle: visit.city || '',
        glyphText: Number(visit.composite_score).toFixed(1), color: '#8c5036', data: visit,
      });
    });
    annotationsRef.current = annotations;
    map.addAnnotations(annotations);
    if (annotations.length) map.showItems(annotations, { padding: new kit.Padding(55, 55, 55, 55) });
  }, [ready, located]);

  useEffect(() => {
    if (!ready) return;
    annotationsRef.current.forEach((annotation) => {
      annotation.selected = annotation.data.id === selectedVisitId;
    });
  }, [ready, located, selectedVisitId]);

  if (provider === 'legacy') return <Suspense fallback={<p className="map-message">Loading the map…</p>}><LegacyVisitsMap visits={visits} selectedVisitId={selectedVisitId} onVisitSelect={onVisitSelect} onVisitClick={onVisitClick} /></Suspense>;
  return <div className="apple-map-stage">
    <div ref={containerRef} className="apple-map-canvas" aria-label="Coffee shop locations" />
    {provider === 'loading' && <p className="map-message" role="status">Loading the map…</p>}
    {provider === 'error' && <div className="map-message" role="alert"><p>Apple Maps couldn’t connect. Your visits are still available in the list.</p><button className="btn-secondary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
    {provider === 'apple' && !located.length && <p className="map-message">No stops to pin here yet. Choose a shop from search when adding a visit.</p>}
  </div>;
}
