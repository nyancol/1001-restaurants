import { useEffect, useRef, useState } from "react";
import {
  apiFetch,
  createPlace,
  listPlaces,
  parseAutocomplete,
  parseDetails,
  patchPlace,
  UnauthorizedError,
  type Place,
  type PlaceDetails,
} from "../../lib/api";
import BottomSheet from "./BottomSheet";
import IconGlyph from "../IconGlyph";
import VenueDataCard from "../VenueDataCard";
import TagCombobox, { type TagMutation } from "../TagCombobox";
import { useLanguage } from "../../i18n/LanguageContext";

const ICON_ROW = ["fork", "croissant", "coffee", "wine", "cocktail"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (p: Place) => void;
  onUnauthorized: () => void;
  onTagDefinitionsChanged?: (m: TagMutation) => void;
}

/** Phone "Add Place" sheet: slides from bottom over list/map, drag handle to close. */
export default function AddPlaceSheet({ open, onClose, onSaved, onUnauthorized, onTagDefinitionsChanged }: Props) {
  const { t } = useLanguage();
  const [lookupText, setLookupText] = useState("");
  const [suggestions, setSuggestions] = useState<{ placeId: string; text: string; secondary?: string }[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [icon, setIcon] = useState("wine");
  const [status, setStatus] = useState<"WANT_TO_GO" | "BEEN_TO">("BEEN_TO");
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [enrichment, setEnrichment] = useState<PlaceDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchSeq = useRef(0);
  const pickSeq = useRef(0);

  useEffect(() => {
    if (open) {
      setLookupText("");
      setSuggestions([]);
      setSuggestOpen(false);
      setSearching(false);
      setLookupError(null);
      setName("");
      setAddress("");
      setGooglePlaceId(null);
      setLat(null);
      setLng(null);
      setIcon("wine");
      setStatus("BEEN_TO");
      setTags([]);
      setNote("");
      setEnrichment(null);
      setSaving(false);
      setError(null);
    }
  }, [open ]);

  async function runSearch() {
    const q = lookupText.trim();
    if (q.length < 2) {
      setLookupError(t["lookup.minChars"]);
      return;
    }
    const my = ++searchSeq.current;
    setLookupError(null);
    setSearching(true);
    try {
      const body = await apiFetch(`/api/google/autocomplete?q=${encodeURIComponent(q)}`);
      if (my !== searchSeq.current) return; // a newer search superseded this one
      const parsed = parseAutocomplete(body);
      setSuggestions(parsed);
      setSuggestOpen(true);
      if (!parsed.length) setLookupError(t["lookup.noMatches"]);
    } catch (err: any) {
      if (my !== searchSeq.current) return;
      if (err?.status !== 503) setLookupError(t["lookup.failed"]);
      else setLookupError(t["lookup.unavailable"]);
    } finally {
      if (my === searchSeq.current) setSearching(false);
    }
  }

  async function pick(placeId: string, label: string) {
    const my = ++pickSeq.current;
    setSuggestOpen(false);
    setLookupError(null);
    try {
      const body = await apiFetch(`/api/google/details?placeId=${encodeURIComponent(placeId)}`);
      if (my !== pickSeq.current) return;
      const d = parseDetails(body, placeId, label);
      handlePick(d);
    } catch {
      if (my !== pickSeq.current) return;
      setLookupError(t["lookup.detailsFailed"]);
      // Details failed: keep the place ID for dedupe but do NOT present the
      // venue as matched/verified (enrichment stays null).
      setGooglePlaceId(placeId);
      setName(label);
      setLookupText(label);
    }
  }

  function handlePick(d: PlaceDetails) {
    setGooglePlaceId(d.googlePlaceId);
    setName(d.name);
    setLookupText(d.address ? `${d.name}, ${d.address.split(",")[0]}` : d.name);
    setAddress(d.address ?? "");
    setLat(d.lat);
    setLng(d.lng);
    if (d.icon) setIcon(d.icon);
    setEnrichment(d);
  }

  /** Abandon the matched venue entirely: identity (place ID + coords) must not linger. */
  function clearPick() {
    setGooglePlaceId(null);
    setLat(null);
    setLng(null);
    setEnrichment(null);
  }

  /**
   * Lenient variant for the 409 path where the existing record could not be
   * fetched: omit (rather than null) every field that would wipe stored data,
   * so the PATCH only touches values the user/form actually provided.
   */
  function duplicatePatchLenient(payload: any) {
    const p: any = { ...payload };
    delete p.rating; // this form has no rating input; never wipe it on duplicates
    if (!tags.length) delete p.tags;
    if (!note) delete p.note;
    if (!address) delete p.address;
    if (lat == null) delete p.lat;
    if (lng == null) delete p.lng;
    if (!enrichment) {
      for (const k of ["hours", "businessStatus", "priceLevel", "priceRange", "googleRating", "googleRatingCount", "websiteUri", "mapsLinks", "utcOffsetMinutes"]) {
        if (p[k] == null) delete p[k];
      }
    }
    return p;
  }

  /**
   * Build a duplicate-update patch that never wipes stored data the user was
   * not asked about: keep the existing rating/tags/note/address/coords unless
   * the form provides a new value, and keep stored Google snapshot fields
   * unless fresh enrichment was fetched.
   */
  function duplicatePatch(existing: Place, payload: any) {
    return {
      ...payload,
      rating: existing.rating,
      tags: tags.length ? tags : (existing.tags ?? []),
      note: note ? note : (existing.note ?? null),
      address: address ? address : (existing.address ?? null),
      lat: lat ?? existing.lat,
      lng: lng ?? existing.lng,
      hours: enrichment?.hours ?? existing.hours,
      businessStatus: enrichment?.businessStatus ?? existing.businessStatus,
      priceLevel: enrichment?.priceLevel ?? existing.priceLevel,
      priceRange: enrichment?.priceRange ?? existing.priceRange,
      googleRating: enrichment?.googleRating ?? existing.googleRating,
      googleRatingCount: enrichment?.googleRatingCount ?? existing.googleRatingCount,
      websiteUri: enrichment?.websiteUri ?? existing.websiteUri,
      mapsLinks: enrichment?.mapsLinks ?? (enrichment?.googleMapsUri ? { placeUri: enrichment.googleMapsUri } : (existing.mapsLinks ?? null)),
      utcOffsetMinutes: enrichment?.utcOffsetMinutes ?? existing.utcOffsetMinutes,
    };
  }

  async function handleSave() {
    if (saving) return;
    setError(null);
    const finalName = (name || lookupText).trim();
    if (!finalName) {
      setError(t["add.nameRequired"]);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: finalName,
        icon: (icon || "fork").trim().toLowerCase() || "fork",
        status,
        tags,
        rating: null,
        note: note ? note : null,
        googlePlaceId,
        address: address ? address : null,
        lat,
        lng,
        hours: enrichment?.hours ?? null,
        businessStatus: enrichment?.businessStatus ?? null,
        priceLevel: enrichment?.priceLevel ?? null,
        priceRange: enrichment?.priceRange ?? null,
        googleRating: enrichment?.googleRating ?? null,
        googleRatingCount: enrichment?.googleRatingCount ?? null,
        websiteUri: enrichment?.websiteUri ?? null,
        mapsLinks: enrichment?.mapsLinks ?? (enrichment?.googleMapsUri ? { placeUri: enrichment.googleMapsUri } : null),
        utcOffsetMinutes: enrichment?.utcOffsetMinutes ?? null,
      };
      if (googlePlaceId) {
        try {
          const mine = await listPlaces({ owner: "me" });
          const existing = mine.find((p) => p.googlePlaceId === googlePlaceId);
          if (existing) {
            const ok = window.confirm(t["add.duplicateNamed"](existing.name));
            if (!ok) {
              setSaving(false);
              return;
            }
            const updated = await patchPlace(existing.id, duplicatePatch(existing, payload));
            onSaved?.(updated);
            onClose();
            return;
          }
        } catch (e: any) {
          if (e instanceof UnauthorizedError) throw e;
          // Pre-check is best-effort: log so failures are observable.
          // The server-side 409 path below still catches real duplicates.
          console.warn("duplicate pre-check failed", e);
        }
      }
      try {
        const created = await createPlace(payload);
        onSaved?.(created);
      } catch (e: any) {
        if (e?.status === 409 && e?.body?.existingId) {
          const ok = window.confirm(t["add.duplicateGeneric"]);
          if (ok) {
            let dupExisting: Place | undefined;
            try {
              const mine = await listPlaces({ owner: "me" });
              dupExisting = mine.find((p) => p.id === e.body.existingId);
            } catch {
              dupExisting = undefined;
            }
            const updated = await patchPlace(
              e.body.existingId,
              dupExisting ? duplicatePatch(dupExisting, payload) : duplicatePatchLenient(payload),
            );
            onSaved?.(updated);
            onClose();
            return;
          }
          setSaving(false);
          return;
        }
        throw e;
      }
      onClose();
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setError(t["add.saveFailed"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Add place">
      <>
        <div className="flex items-center justify-between px-4 pb-1 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent" /> Add place
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add place"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2/70 text-xl text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ overscrollBehavior: "contain" }}>
          {(name || lookupText) && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-bg">
              <span aria-hidden className="inline-block h-2 w-2 animate-pulse rounded-full bg-been" />
              <IconGlyph id={icon} size={15} />
              <span>{(name || lookupText).slice(0, 24)} (Adding)</span>
            </div>
          )}

          <div className="mb-2 flex flex-col gap-2">
            <div className="relative flex items-center">
              <span aria-hidden className="pointer-events-none absolute left-3.5 text-lg text-muted">⌕</span>
              <input
                value={lookupText}
                onChange={(e) => setLookupText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  } else if (e.key === "Escape") setSuggestOpen(false);
                }}
                placeholder="Search venue on Google / Maps..."
                aria-label="Search venue"
                className="edge w-full border-line bg-bg py-3 pl-10 pr-10 text-sm text-ink placeholder:text-muted"
                style={{ borderRadius: 12 }}
              />
              {lookupText && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setLookupText("");
                    setSuggestions([]);
                    setSuggestOpen(false);
                    clearPick();
                  }}
                  className="absolute right-3 text-lg text-muted"
                >
                  ⊗
                </button>
              )}
            </div>
            {!enrichment && (
              <button
                type="button"
                onClick={() => void runSearch()}
                disabled={searching || lookupText.trim().length < 2}
                className="edge border-accent bg-accent px-3 py-2 text-sm font-bold text-accent-ink disabled:opacity-50"
                style={{ borderRadius: 12 }}
              >
                {searching ? "…" : t["lookup.search"]}
              </button>
            )}
            {lookupError && <div className="text-xs text-want-ink">{lookupError}</div>}
            {suggestOpen && suggestions.length > 0 && (
              <ul className="edge radius-card z-10 max-h-60 w-full overflow-auto border-line bg-surface shadow-theme">
                {suggestions.map((s) => (
                  <li key={s.placeId}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-2"
                      onClick={() => void pick(s.placeId, s.text)}
                    >
                      <span className="block font-medium">{s.text}</span>
                      {s.secondary && <span className="block text-muted">{s.secondary}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {enrichment && (
              <div className="flex items-center justify-between rounded-lg bg-been/50 px-3 py-1.5 text-xs font-semibold text-been-ink">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span aria-hidden>✓</span>
                  <span className="truncate">Venue matched: <strong>{name}{address ? `, ${address.split(",").slice(-1)[0]?.trim()}` : ""}</strong></span>
                </span>
                <button type="button" className="ml-2 shrink-0 font-bold underline" onClick={clearPick}>
                  Change
                </button>
              </div>
            )}
          </div>

          {enrichment && <VenueDataCard enrichment={enrichment} />}

          {error && <div className="edge radius-input mb-3 border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">{error}</div>}

          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-place-name" className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
                <span>Place name</span>
                {enrichment && <span className="font-semibold normal-case text-accent">verified</span>}
              </label>
              <input
                id="add-place-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Clamato"
                className="edge w-full border-line bg-bg px-3.5 py-2.5 font-display text-base font-semibold text-ink"
                style={{ borderRadius: 12 }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-place-address" className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                Address / arrondissement
              </label>
              <div className="relative flex items-center">
                <span aria-hidden className="absolute left-3 text-lg text-muted">📍</span>
                <input
                  id="add-place-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="80 Rue de Charonne, 75011 Paris"
                  className="edge w-full border-line bg-bg py-2.5 pl-9 pr-3.5 text-sm text-ink"
                  style={{ borderRadius: 12 }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Visit status</span>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2/70 p-1" role="group" aria-label="Visit status">
                <button
                  type="button"
                  aria-pressed={status === "WANT_TO_GO"}
                  onClick={() => setStatus("WANT_TO_GO")}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 text-sm font-bold ${status === "WANT_TO_GO" ? "bg-surface text-ink shadow-theme" : "text-muted"}`}
                  style={{ borderRadius: 9 }}
                >
                  <span aria-hidden>🔖</span> Want to go
                </button>
                <button
                  type="button"
                  aria-pressed={status === "BEEN_TO"}
                  onClick={() => setStatus("BEEN_TO")}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 text-sm font-bold ${status === "BEEN_TO" ? "bg-surface text-accent shadow-theme" : "text-muted"}`}
                  style={{ borderRadius: 9 }}
                >
                  <span aria-hidden>✓</span> Been here
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Icon (shown on map &amp; timeline)</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto rounded-xl bg-surface-2/50 p-2" role="radiogroup" aria-label="place icon">
                {ICON_ROW.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={icon === id}
                    title={id}
                    onClick={() => setIcon(id)}
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${icon === id ? "bg-accent text-accent-ink shadow-theme" : "bg-surface text-muted"}`}
                  >
                    <IconGlyph id={id} size={20} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Tags</span>
              <div className="edge border-line/50 bg-bg p-2" style={{ borderRadius: 12 }}>
                <TagCombobox value={tags} onChange={setTags} onTagDefinitionsChanged={onTagDefinitionsChanged} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="add-place-note" className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-muted">
                  <span aria-hidden>📝</span> My personal note
                </label>
                <span className="text-[10px] text-muted">Markdown supported</span>
              </div>
              <textarea
                id="add-place-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="What made this memorable?"
                className="edge w-full resize-none rounded-xl border-line bg-bg p-3.5 text-sm leading-relaxed text-ink"
              />
              <div className="flex justify-end">
                <span className="text-[11px] font-medium text-muted">{note.length} characters</span>
              </div>
            </div>
            <div className="h-2" />
          </form>
        </div>

        <div className="grid grid-cols-[1fr_2fr] items-center gap-2 border-t border-line/60 bg-[#fff8e8] p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="edge inline-flex min-h-[52px] items-center justify-center border-line bg-surface-2/60 px-4 text-base font-bold text-ink"
            style={{ borderRadius: 12 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="edge inline-flex min-h-[52px] items-center justify-center gap-2 border-accent bg-accent px-4 text-base font-bold text-accent-ink disabled:opacity-50"
            style={{ borderRadius: 12 }}
          >
            <span aria-hidden>🔖</span> {saving ? t["add.saving"] : "Add to Journal"}
          </button>
        </div>
      </>
    </BottomSheet>
  );
}
