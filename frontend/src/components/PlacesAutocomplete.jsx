import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { resolvePlace, searchPlaces } from '../utils/mapkit';
import { getShopRepeatKey } from '../utils/repeats';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const SUGGESTION_CACHE_LIMIT = 30;
const SUGGESTION_CACHE_TTL_MS = 10 * 60 * 1000;

// Survives remounts of the add-visit form for this page session, so retyping a
// name or reopening the form does not repeat the same search.
const suggestionCache = new Map();

function readSuggestionCache(key) {
  const hit = suggestionCache.get(key);
  if (!hit) return null;
  suggestionCache.delete(key);
  if (Date.now() - hit.cachedAt > SUGGESTION_CACHE_TTL_MS) return null;
  suggestionCache.set(key, hit);
  return hit.suggestions.slice();
}

function writeSuggestionCache(key, suggestions) {
  suggestionCache.delete(key);
  suggestionCache.set(key, { suggestions: suggestions.slice(), cachedAt: Date.now() });
  while (suggestionCache.size > SUGGESTION_CACHE_LIMIT) suggestionCache.delete(suggestionCache.keys().next().value);
}

export default function PlacesAutocomplete({
  id, onPlaceSelected, value, onChange, onBlur, disabled = false,
  inputClassName = 'input-field', ariaInvalid, ariaDescribedBy, enterKeyHint,
  savedPlaces = [], city = '', onBusyChange,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const requestRef = useRef(0);
  const selectedValueRef = useRef(value || '');
  const selectionRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const statusId = `${listId}-status`;
  const localSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (query.length < 2) return [];
    const seen = new Set();
    return savedPlaces.filter((place) => {
      const key = getShopRepeatKey(place);
      if (seen.has(key) || !place.coffee_shop_name?.toLowerCase().includes(query)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4).map((place) => ({
      key: `saved-${place.id}`, mainText: place.coffee_shop_name,
      secondaryText: place.city || place.coffee_shop_address, provider: 'saved', place,
    }));
  }, [value, savedPlaces]);

  useEffect(() => {
    onBusyChange?.(resolving);
  }, [resolving, onBusyChange]);

  useEffect(() => () => selectionRef.current?.abort(), []);

  useEffect(() => {
    const ticket = ++requestRef.current;
    setSuggestions([]);
    setActive(-1);
    setMessage('');
    setLoading(false);
    const query = (value || '').trim();
    if (!open || query.length < MIN_QUERY_LENGTH || value === selectedValueRef.current) return;
    const cacheKey = `${(city || '').trim().toLowerCase()}|${query.toLowerCase()}`;
    const cached = readSuggestionCache(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, 6));
      if (!cached.length) setMessage('No matching shops. Try adding the city, or enter the location manually.');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await searchPlaces(query, { signal: controller.signal, city });
        if (ticket !== requestRef.current) return;
        writeSuggestionCache(cacheKey, matches);
        setSuggestions(matches.slice(0, 6));
        if (!matches.length) setMessage('No matching shops. Try adding the city, or enter the location manually.');
      } catch (error) {
        if (controller.signal.aborted || ticket !== requestRef.current) return;
        setMessage('Search is unavailable. Choose a saved shop or enter the location manually.');
      } finally {
        if (ticket === requestRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); ++requestRef.current; };
  }, [value, open, city]);

  const matches = [...localSuggestions, ...suggestions];
  const expanded = open && matches.length > 0;
  const select = async (suggestion) => {
    const controller = new AbortController();
    selectionRef.current?.abort();
    selectionRef.current = controller;
    setOpen(false);
    setMessage('');
    setResolving(true);
    try {
      const place = suggestion.provider === 'saved' ? {
        name: suggestion.place.coffee_shop_name, city: suggestion.place.city,
        address: suggestion.place.coffee_shop_address, place_id: suggestion.place.coffee_shop_place_id,
        lat: suggestion.place.coffee_shop_lat, lng: suggestion.place.coffee_shop_lng, shop_id: suggestion.place.shop_id,
      } : await resolvePlace(suggestion, { signal: controller.signal });
      if (controller.signal.aborted) return;
      selectedValueRef.current = place.name;
      onPlaceSelected?.(place);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.message || 'Could not load the shop. Try again or enter the location manually.');
    } finally {
      if (selectionRef.current === controller) setResolving(false);
    }
  };

  return (
    <div className="places-input" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <input ref={inputRef} id={id} name="coffee_shop_name" type="text" value={value}
        onChange={(event) => {
          selectionRef.current?.abort(); setResolving(false);
          selectedValueRef.current = ''; setOpen(true); onChange(event);
        }}
        onFocus={() => setOpen(true)} onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault(); event.stopPropagation(); setOpen(false); return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!matches.length) return;
            event.preventDefault(); setOpen(true);
            setActive((previous) => event.key === 'ArrowDown' ? (previous + 1) % matches.length : (previous <= 0 ? matches.length - 1 : previous - 1));
          } else if (event.key === 'Enter' && expanded && active >= 0 && matches[active]) {
            event.preventDefault(); select(matches[active]);
          }
        }}
        placeholder="Search a shop, or type its name" className={inputClassName}
        autoComplete="off" autoCapitalize="words" disabled={disabled}
        role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 && matches[active] ? `${listId}-${active}` : undefined}
        aria-invalid={ariaInvalid} aria-describedby={[ariaDescribedBy, statusId].filter(Boolean).join(' ')}
        aria-busy={loading || resolving} enterKeyHint={enterKeyHint}
      />
      {expanded && (
        <ul id={listId} className="places-results" role="listbox" aria-label="Coffee shops">
          {matches.map((suggestion, index) => (
            <li id={`${listId}-${index}`} key={suggestion.key} role="option" aria-selected={active === index}
              onPointerDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(index)} onClick={() => select(suggestion)}>
              <strong>{suggestion.mainText}</strong>
              <span>{suggestion.secondaryText}</span>
              <small>{suggestion.provider === 'saved' ? 'From your journal' : suggestion.provider === 'apple' ? 'Apple Maps' : 'Google Maps'}</small>
            </li>
          ))}
        </ul>
      )}
      <p id={statusId} className="places-status" role="status">
        {resolving ? 'Filling in the location…' : loading ? 'Looking for shops…' : message}
      </p>
    </div>
  );
}
