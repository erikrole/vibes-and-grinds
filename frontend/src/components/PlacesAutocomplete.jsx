import { useState, useEffect, useRef } from 'react';

export default function PlacesAutocomplete({ onPlaceSelected, value, onChange }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load Google Maps script
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['cafe', 'restaurant', 'establishment'],
      fields: ['name', 'formatted_address', 'place_id', 'geometry'],
    });

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();

      if (!place.geometry) {
        console.error('No geometry found for place');
        return;
      }

      const placeData = {
        name: place.name,
        address: place.formatted_address,
        place_id: place.place_id,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      onPlaceSelected(placeData);
    });
  }, [isLoaded, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Search for a coffee shop..."
      className="input-field"
    />
  );
}
