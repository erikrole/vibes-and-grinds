import { useEffect, useState } from 'react';

export function readRoute(search = window.location.search) {
  const params = new URLSearchParams(search);
  return {
    view: ['map', 'insights'].includes(params.get('view')) ? params.get('view') : 'visits',
    visit: params.get('visit') || null,
    shop: params.get('shop') || null,
    season: params.get('season') || null,
    app: params.get('app') === 'vest' ? 'vest' : 'vibes',
  };
}

export function routeSearch(route) {
  const params = new URLSearchParams();
  if (route.view && route.view !== 'visits') params.set('view', route.view);
  for (const key of ['shop', 'visit', 'season']) if (route[key]) params.set(key, route[key]);
  if (route.app === 'vest') params.set('app', 'vest');
  return params.size ? `?${params}` : '';
}

export default function useJournalRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const navigate = (updates, { replace = false, layer = false } = {}) => {
    const next = { ...readRoute(), ...updates };
    const state = replace ? window.history.state : { vgLayer: layer };
    window.history[replace ? 'replaceState' : 'pushState'](state, '', `${window.location.pathname}${routeSearch(next)}`);
    setRoute(next);
  };
  const closeLayer = (key) => {
    if (window.history.state?.vgLayer) window.history.back();
    else navigate({ [key]: null }, { replace: true });
  };
  return { route, navigate, closeLayer };
}
