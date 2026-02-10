import { useEffect, useMemo, useRef, useState } from 'react';

const MIN_QUERY_LENGTH = 2;

async function parseApiError(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data?.error || data?.details || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export default function PlacesAutocomplete({ onPlaceSelected, value, onChange, disabled = false }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [value]);

  useEffect(() => {
    const query = (value || '').trim();

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setStatusMessage('');
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setStatusMessage('');

      try {
        const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await parseApiError(response, 'Google Places is unavailable right now. You can still type manually.');
          throw new Error(message);
        }

        const data = await response.json();
        if (requestIdRef.current !== currentRequestId) return;

        const nextSuggestions = data.suggestions || [];
        setSuggestions(nextSuggestions);

        if (!nextSuggestions.length) {
          setStatusMessage('No Google Places matches yet. Keep typing or enter manually.');
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        if (requestIdRef.current !== currentRequestId) return;

        setSuggestions([]);
        setStatusMessage(error.message || 'Google Places unavailable right now. You can still type manually.');
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const hasSuggestions = suggestions.length > 0;

  const helperText = useMemo(() => {
    if (isLoading) {
      return 'Searching Google Places…';
    }

    return statusMessage;
  }, [isLoading, statusMessage]);

  const handleSelectSuggestion = async (suggestion) => {
    setShowSuggestions(false);
    setStatusMessage('');

    if (!suggestion?.placeId) {
      return;
    }

    try {
      const response = await fetch(`/api/places-details?placeId=${encodeURIComponent(suggestion.placeId)}`);
      if (!response.ok) {
        const message = await parseApiError(response, 'Could not load full place details. You can still save manually.');
        throw new Error(message);
      }

      const data = await response.json();
      onPlaceSelected?.(data.place);
    } catch (error) {
      setStatusMessage(error.message || 'Could not load full place details. You can still save manually.');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Search for a coffee shop..."
        className="input-field"
        autoComplete="off"
        disabled={disabled}
      />

      {showSuggestions && hasSuggestions && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-xl dark:border-stone-700 dark:bg-stone-900">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{suggestion.mainText}</p>
                {suggestion.secondaryText && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">{suggestion.secondaryText}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {helperText && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{helperText}</p>}
    </div>
  );
}
