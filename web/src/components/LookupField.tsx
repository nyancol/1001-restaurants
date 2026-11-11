import { useState } from "react";
import { apiFetch, parseAutocomplete, parseDetails, type PlaceDetails } from "../lib/api";

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onPick: (details: PlaceDetails) => void;
  onManualText?: () => void;
}

// In-session cache: repeat searches for the same query don't hit Google again.
const cache = new Map<string, { placeId: string; text: string; secondary?: string }[]>();

export default function LookupField({ text, onTextChange, onPick }: Props) {
  const [suggestions, setSuggestions] = useState<{ placeId: string; text: string; secondary?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = text.trim();
    if (q.length < 2) {
      setError("Type at least 2 characters, then Search.");
      return;
    }
    setError(null);
    const key = q.toLowerCase();
    if (cache.has(key)) {
      setSuggestions(cache.get(key)!);
      setOpen(true);
      setSearched(true);
      return;
    }
    setLoading(true);
    try {
      const body = await apiFetch(`/api/google/autocomplete?q=${encodeURIComponent(q)}`);
      const parsed = parseAutocomplete(body);
      cache.set(key, parsed);
      setSuggestions(parsed);
      setOpen(true);
      setSearched(true);
      setUnavailable(false);
      if (parsed.length === 0) setError("No matches — adjust your search or save manually below.");
    } catch (err: any) {
      if (err?.status === 503) {
        setUnavailable(true);
        setSuggestions([]);
      } else if (err?.name !== "UnauthorizedError") {
        setError("Lookup failed — you can still save manually below.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function pick(placeId: string, label: string) {
    setOpen(false);
    setError(null);
    try {
      const body = await apiFetch(`/api/google/details?placeId=${encodeURIComponent(placeId)}`);
      onPick(parseDetails(body, placeId, label));
    } catch {
      // Details failure: keep typed text, allow manual save without coords.
      setError("Details unavailable — kept your text, you can save without coordinates.");
      onPick({ googlePlaceId: placeId, name: label, address: null, lat: null, lng: null });
    }
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1" htmlFor="lookup">
        Name lookup
      </label>
      <div className="flex gap-2">
        <input
          id="lookup"
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            setSearched(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Type a name, then Search"
          autoComplete="off"
          className="min-w-0 flex-1 rounded border px-3 py-2"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading || text.trim().length < 2}
          className="shrink-0 rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>
      {loading && <div className="mt-1 text-sm text-slate-500">Searching…</div>}
      {unavailable && (
        <div className="mt-1 text-sm text-amber-700">
          Google lookup is not configured — manual entry below works fine.
        </div>
      )}
      {error && <div className="mt-1 text-sm text-amber-700">{error}</div>}
      {open && searched && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => pick(s.placeId, s.text)}
              >
                <span className="block font-medium">{s.text}</span>
                {s.secondary && <span className="block text-slate-500">{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
