import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

// Regional indicator flag from an ISO 3166-1 alpha-2 country code, e.g. "US" -> 🇺🇸.
const countryFlag = (countryCode) =>
  (countryCode || "")
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

// Disambiguated label for a geocoding match, e.g. "Springfield, Illinois, US".
const describeMatch = (match) => {
  const parts = [match.name];
  if (match.state) parts.push(match.state);
  parts.push(match.country);
  return parts.join(", ");
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
  // Set right before onSelect writes the picked label back into `value`, so
  // that write doesn't get treated as a fresh keystroke and re-query itself
  // right back open.
  const suppressNextSearchRef = useRef(false);

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return undefined;
    }

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
    suppressNextSearchRef.current = true;
    setOpen(false);
    setMatches([]);
    onSelect(match, describeMatch(match));
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
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => matches.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-[9999px] border border-white/25 bg-white/10 px-5 py-2.5 text-white placeholder-white/50 outline-none transition focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/40"
        />

        {searching && (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-[9999px] border-2 border-white/25 border-t-white/70" />
          </div>
        )}

        {open && matches.length > 0 && (
          <ul
            id="city-search-listbox"
            role="listbox"
            // Deliberately more opaque than .glass-card: this floats over
            // whatever comes next in the layout (unit toggles, favourite
            // chips on mobile's stacked search row), and the usual 10%
            // glass tint let that content ghost through and muddy the list.
            className="animate-rise absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 overflow-y-auto rounded-3xl border border-white/25 bg-dusk-900/90 p-1.5 text-left shadow-2xl backdrop-blur-2xl"
          >
            {matches.map((match, index) => {
              const label = describeMatch(match);
              const isActive = index === highlighted;
              return (
                <li key={`${match.lat}-${match.lon}-${index}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMatch(match)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm transition ${
                      isActive ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {countryFlag(match.country)}
                    </span>
                    <span className="flex-1 truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        onClick={onSubmit}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9999px] bg-gradient-to-r from-sky-500 to-pop-500 transition hover:opacity-90"
      >
        <i className="material-icons text-xl">search</i>
      </button>
    </div>
  );
}

export default CitySearchBox;
