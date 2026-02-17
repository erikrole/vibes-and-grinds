import { useState, useEffect, useRef } from 'react';

export default function AutocompleteInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '',
  className = '',
  name = '',
  type = 'text',
  required = false,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!value || suggestions.length === 0) {
      setFilteredSuggestions([]);
      return;
    }

    const normalizedValue = value.toLowerCase().trim();
    const filtered = suggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(normalizedValue))
      .slice(0, 8);

    setFilteredSuggestions(filtered);
  }, [value, suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion) => {
    onChange({ target: { name, value: suggestion } });
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    onChange(e);
    const hasValue = Boolean(e.target.value.trim());
    setShowSuggestions(hasValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    const hasValue = Boolean(value?.trim());
    setShowSuggestions(hasValue && filteredSuggestions.length > 0);
  };

  const shouldShowSuggestions =
    isFocused && showSuggestions && filteredSuggestions.length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
        spellCheck={false}
      />

      {shouldShowSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-20 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion) => (
            <button
              key={`${name}-${suggestion}`}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-4 py-2.5 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors first:rounded-t-md last:rounded-b-md"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
