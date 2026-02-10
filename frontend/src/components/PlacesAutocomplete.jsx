import { useEffect, useRef, useState } from 'react';

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-script';

function loadGooglePlacesScript(apiKey, onAuthFailure) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    window.gm_authFailure = () => {
      onAuthFailure?.();
      reject(new Error('Google Maps authorization failed'));
    };

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));

    document.head.appendChild(script);
  });
}

export default function PlacesAutocomplete({ onPlaceSelected, value, onChange }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | unavailable
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus('unavailable');
      setErrorMessage('Google Places is not configured. You can still type manually.');
      return;
    }

    let isMounted = true;

    setStatus('loading');
    loadGooglePlacesScript(apiKey, () => {
      if (!isMounted) return;
      setStatus('unavailable');
      setErrorMessage('Google Places authorization failed (check key restrictions/billing). You can still type manually.');
    })
      .then(() => {
        if (!isMounted) return;
        if (window.google?.maps?.places) {
          setStatus('ready');
        } else {
          setStatus('unavailable');
          setErrorMessage('Google Places is unavailable right now. You can still type manually.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('unavailable');
        setErrorMessage('Google Places failed to load. You can still type manually.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['cafe', 'restaurant', 'establishment'],
      fields: ['name', 'formatted_address', 'place_id', 'geometry'],
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();

      if (!place?.geometry) {
        return;
      }

      onPlaceSelected({
        name: place.name,
        address: place.formatted_address,
        place_id: place.place_id,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });

    return () => {
      if (listener?.remove) {
        listener.remove();
      }
    };
  }, [status, onPlaceSelected]);

  const showFallback = status === 'unavailable';

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={showFallback ? 'Type coffee shop name manually...' : 'Search for a coffee shop...'}
        className="input-field"
        autoComplete="off"
      />

      {showFallback && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
