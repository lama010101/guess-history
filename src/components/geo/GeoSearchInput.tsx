import React, { useEffect, useMemo, useRef, useState } from 'react';
import { suggest } from '@/lib/geo/suggest';
import { GeoHit } from '@/lib/geo/types';
import { cn } from '@/lib/utils';
import { Loader2, MapPin, Search, X } from 'lucide-react';

export interface GeoSearchInputProps {
  placeholder?: string;
  center?: { lat: number; lon: number } | null;
  onChoose: (hit: GeoHit) => void;
  onManualPin?: () => void;
  className?: string;
}

const GeoSearchInput: React.FC<GeoSearchInputProps> = ({
  placeholder = 'Search a place (city, country)...',
  center,
  onChoose,
  onManualPin,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeoHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);

  const hasResults = results.length > 0;

  function clearDebounce() {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function cancelInFlight() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearDebounce();
      cancelInFlight();
    };
  }, []);

  // When the keyboard opens on mobile, ensure the input stays visible.
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return;
    const handler = () => {
      if (focused) {
        // Defer slightly to let layout settle
        setTimeout(() => {
          const el = inputRef.current;
          if (!el) return;
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {
            // Fallback for older browsers
            const rect = el.getBoundingClientRect();
            window.scrollTo({ top: rect.top + window.scrollY - 24, behavior: 'smooth' });
          }
        }, 50);
      }
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, [focused]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setOpen(false);
      setActiveIndex(-1);
      cancelInFlight();
      clearDebounce();
      return;
    }

    clearDebounce();
    cancelInFlight();
    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const hits = await suggest(q, { signal: controller.signal, center: center ?? undefined });
        setResults(hits);
        setOpen(true);
        setActiveIndex(hits.length > 0 ? 0 : -1);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError('Search failed.');
        setResults([]);
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query, center]);

  const choose = (hit: GeoHit) => {
    setQuery(`${hit.name}${hit.admin ? ', ' + hit.admin : ''}, ${hit.country}`);
    setOpen(false);
    setActiveIndex(-1);
    onChoose(hit);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        choose(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative" role="combobox" aria-expanded={open} aria-haspopup="listbox">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            // Ensure input is visible when focusing
            setTimeout(() => {
              const el = inputRef.current;
              if (!el) return;
              try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } catch {
                const rect = el.getBoundingClientRect();
                window.scrollTo({ top: rect.top + window.scrollY - 24, behavior: 'smooth' });
              }
            }, 0);
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full rounded-md bg-white dark:bg-[#1f1f1f] text-black dark:text-white px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-autocomplete="list"
          aria-controls="geo-suggest-list"
          aria-activedescendant={activeIndex >= 0 ? `geo-suggest-item-${activeIndex}` : undefined}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => (results.length > 0 ? !v : v))}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
          aria-label="Toggle suggestions"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-md max-h-64 overflow-auto shadow-lg">
          {hasResults ? (
            <ul id="geo-suggest-list" role="listbox" ref={listRef}>
              {results.map((r, idx) => (
                <li
                  id={`geo-suggest-item-${idx}`}
                  key={`${r.lat}-${r.lon}-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={cn(
                    'px-3 py-2 text-sm text-black dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a2a2a]',
                    idx === activeIndex && 'bg-gray-100 dark:bg-[#2a2a2a]'
                  )}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => choose(r)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="truncate">{r.name}{r.admin ? `, ${r.admin}` : ''}, {r.country}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
              {error ? (
                <div>{error}</div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>No results.</span>
                  {onManualPin && (
                    <button
                      type="button"
                      onClick={() => onManualPin?.()}
                      className="ml-3 inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                    >
                      <MapPin className="h-4 w-4" /> Place a pin manually
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeoSearchInput;
