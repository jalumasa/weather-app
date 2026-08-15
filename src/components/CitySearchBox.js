import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

// Splits a geocoding match into the city and the qualifier that disambiguates
// it, so the row can lead with the name and mute the rest rather than running
// "Springfield, Illinois, US" together at one weight.
const describeMatch = (match) => {
  const region = [match.state, match.country].filter(Boolean).join(", ");
  return {
    primary: match.name,
    secondary: region,
    full: [match.name, region].filter(Boolean).join(", "),
  };
};

/*
  City search with a live location dropdown. Typing debounces into a call to
  /api/geocode (OpenWeatherMap's geocoding endpoint), and each result can be
  picked with a click or the keyboard so the right "Springfield" - there are
  dozens - actually gets selected instead of guessed at.

  onSelect(match, label) hands back the full geocoding match (with lat/lon),
  not just a name string: OpenWeatherMap's name-based weather lookup ignores
  the state qualifier for US cities (q=Berlin,Illinois,US silently returns
  Berlin, Germany), so the caller needs coordinates to fetch the exact place
  that was actually picked.

  Stays a plain input+button when nothing's been typed yet or no matches come
  back, so the existing "type a name, hit search" flow keeps working.
*/
function CitySearchBox({ value, onChange, onSelect, onSubmit }) {
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  // Only typing should open the dropdown. `value` also changes when something
  // else writes to the box - picking a suggestion puts its label back, and
  // choosing a saved location fills in that city - and none of those are a
  // query the user is asking us to run.
  const typedRef = useRef(false);

  useEffect(() => {
    if (!typedRef.current) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setMatches([]);
      setSearching(false);
      setOpen(false);
      return undefined;
    }
    typedRef.current = false;

    const query = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setMatches([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(
          `/geocode?q=${encodeURIComponent(query)}`
        );
        // Drop stale responses from an earlier keystroke that resolved late.
        if (requestId !== requestIdRef.current) return;
        setMatches(Array.isArray(response.data) ? response.data : []);
        setOpen(true);
        setHighlighted(-1);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setMatches([]);
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickMatch = (match) => {
    setOpen(false);
    setMatches([]);
    onSelect(match, describeMatch(match).full);
  };

  const handleKeyDown = (event) => {
    if (!open || matches.length === 0) {
      if (event.key === "Enter") onSubmit();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (highlighted >= 0 && highlighted < matches.length) {
        pickMatch(matches[highlighted]);
      } else {
        setOpen(false);
        onSubmit();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="search relative flex flex-1 items-center gap-2">
      <div className="relative w-full flex-1">
        <input
          type="text"
          value={value}
          placeholder="Enter City name"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="city-search-listbox"
          aria-autocomplete="list"
          onChange={(e) => {
            typedRef.current = true;
            onChange(e.target.value);
          }}
          onFocus={() => matches.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-[9999px] bg-[var(--field)] px-4 py-2 text-small text-ink-100 placeholder-ink-500 outline-none transition-colors focus:bg-[var(--state-active)]"
        />

        {searching && (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-3 w-3 animate-spin rounded-[9999px] border border-[var(--track)] border-t-[var(--color-ink-200)]" />
          </div>
        )}

        {open && matches.length > 0 && (
          <ul
            id="city-search-listbox"
            role="listbox"
            // Opaque rather than a translucent panel: this floats over live
            // content, and letting that content ghost through made the list
            // hard to read.
            className="overlay-panel animate-rise absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 overflow-y-auto p-1.5 text-left"
          >
            {matches.map((match, index) => {
              const { primary, secondary } = describeMatch(match);
              const isActive = index === highlighted;
              return (
                <li key={`${match.lat}-${match.lon}-${index}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMatch(match)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`flex w-full items-baseline gap-2 rounded-[14px] px-3 py-2 text-left text-small transition-colors ${
                      isActive ? "bg-[var(--state-hover)]" : ""
                    }`}
                  >
                    <span className="shrink-0 text-ink-100">{primary}</span>
                    <span className="truncate text-tiny text-ink-400">
                      {secondary}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        onClick={onSubmit}
        aria-label="Search"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9999px] bg-[var(--field)] text-ink-300 transition-colors hover:bg-[var(--state-active)] hover:text-ink-100"
      >
        <i className="material-icons text-base">search</i>
      </button>
    </div>
  );
}

export default CitySearchBox;
