import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LookupField from "../components/LookupField";
import TagCombobox from "../components/TagCombobox";
import Stars from "../components/Stars";
import { createPlace, listPlaces, patchPlace, UnauthorizedError } from "../lib/api";

export default function AddPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const navigate = useNavigate();
  const [lookupText, setLookupText] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [status, setStatus] = useState<"WANT_TO_GO" | "BEEN_TO">("WANT_TO_GO");
  const [tags, setTags] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handlePick(d: { googlePlaceId: string; name: string; address: string | null; lat: number | null; lng: number | null }) {
    setGooglePlaceId(d.googlePlaceId);
    setName(d.name);
    setLookupText(d.name);
    setAddress(d.address ?? "");
    setLat(d.lat);
    setLng(d.lng);
  }

  async function handleSave() {
    setError(null);
    setInfo(null);
    const finalName = (name || lookupText).trim();
    if (!finalName) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: finalName,
        status,
        tags,
        rating,
        note: note ? note : null,
        googlePlaceId,
        address: address ? address : null,
        lat,
        lng,
      };
      // Duplicate googlePlaceId per owner → update-confirm, no silent fork.
      if (googlePlaceId) {
        try {
          const mine = await listPlaces({ owner: "me" });
          const existing = mine.find((p) => p.googlePlaceId === googlePlaceId);
          if (existing) {
            const ok = window.confirm(
              `You already saved “${existing.name}”. Update it instead of creating a duplicate?`
            );
            if (!ok) {
              setSaving(false);
              return;
            }
            await patchPlace(existing.id, payload);
            setInfo("Updated your existing entry.");
            navigate("/");
            return;
          }
        } catch (e: any) {
          if (e instanceof UnauthorizedError) throw e;
          // Fall through to POST; server also guards duplicates.
        }
      }
      try {
        await createPlace(payload);
      } catch (e: any) {
        // Server-side duplicate guard returns 200-updated or 409 with existing id.
        if (e?.status === 409 && e?.body?.existingId) {
          const ok = window.confirm("You already saved this place. Update it instead?");
          if (ok) {
            await patchPlace(e.body.existingId, payload);
            navigate("/");
            return;
          }
          setSaving(false);
          return;
        }
        throw e;
      }
      navigate("/");
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-4">
      <h1 className="mb-4 text-xl font-bold">Add a place</h1>
      {error && <div className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</div>}
      {info && <div className="mb-3 rounded bg-blue-100 px-3 py-2 text-sm text-blue-800">{info}</div>}
      <div className="flex flex-col gap-4">
        <LookupField text={lookupText} onTextChange={(t) => { setLookupText(t); if (!name || t === "") setName(t); }} onPick={handlePick} />
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">Name *</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Place name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="address">Address</label>
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Address (prefilled from lookup)"
          />
        </div>
        <div>
          <span className="block text-sm font-medium mb-1">Status</span>
          <div className="flex gap-2" role="radiogroup" aria-label="status">
            {(["WANT_TO_GO", "BEEN_TO"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === s ? "bg-black text-white" : "bg-slate-200 text-slate-800"}`}
              >
                {s === "WANT_TO_GO" ? "Want to go" : "Been to"}
              </button>
            ))}
          </div>
        </div>
        <TagCombobox value={tags} onChange={setTags} />
        <Stars value={rating} onChange={setRating} />
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="note">Note</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border px-3 py-2"
            rows={3}
            placeholder="A note…"
          />
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded border px-4 py-2 text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save place"}
          </button>
        </div>
      </div>
    </div>
  );
}
