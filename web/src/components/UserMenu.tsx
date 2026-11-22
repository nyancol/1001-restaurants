import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useUsers } from "../lib/useUsers";

interface Props {
  displayName: string | null;
}

/**
 * Header user menu — the existing top-right avatar becomes the user switch.
 * Dropdown lists every user with only avatar/initial, name and place count;
 * picking one sets the shared `?owner=` filter so list + map show their places.
 */
export default function UserMenu({ displayName }: Props) {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { me, users, loading, error } = useUsers();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const ownerParam = searchParams.get("owner") ?? "me";
  const owner = ownerParam === "" ? "me" : ownerParam;
  const isMeActive = owner === "me" || (me != null && owner === me.id);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!loading && users.length <= 1) {
    return (
      <span
        className="edge inline-flex h-8 w-8 shrink-0 items-center justify-center border-line bg-surface-2 text-xs font-bold text-ink lg:h-9 lg:w-9"
        style={{ borderRadius: 999 }}
        aria-hidden
        title={displayName ?? t["app.meFallback"]}
      >
        {(displayName ?? "C").slice(0, 1).toUpperCase()}
      </span>
    );
  }

  function pick(id: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === "me") next.delete("owner");
        else next.set("owner", id);
        return next;
      },
      { replace: true },
    );
    setOpen(false);
  }

  const meCount = me ? (users.find((u) => u.id === me.id)?.placeCount ?? 0) : 0;
  const meName = me?.displayName ?? displayName ?? t["scope.me"];
  const entries = [
    { id: "me", name: meName, count: meCount, active: isMeActive },
    {
      id: "all",
      name: t["scope.everyone"],
      count: users.reduce((n, u) => n + (u.placeCount ?? 0), 0),
      active: owner === "all",
    },
    ...users
      .filter((u) => (me ? u.id !== me.id : true))
      .map((u) => ({
        id: u.id,
        name: u.displayName ?? u.id,
        count: u.placeCount ?? 0,
        active: owner === u.id,
      })),
  ];

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t["owner.scopeAria"]}
        title={displayName ?? t["app.meFallback"]}
        className="edge inline-flex h-8 w-8 items-center justify-center border-line bg-surface-2 text-xs font-bold text-ink lg:h-9 lg:w-9"
        style={{ borderRadius: 999 }}
      >
        {(displayName ?? "C").slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t["owner.scopeAria"]}
          className="edge absolute right-0 top-full z-30 mt-2 w-60 border-line bg-surface p-1.5 shadow-theme"
          style={{ borderRadius: 16 }}
        >
          {loading ? (
            [0, 1].map((i) => (
              <div key={i} aria-hidden className="flex animate-pulse items-center gap-2 px-2 py-2">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center bg-line/40"
                  style={{ borderRadius: 999 }}
                />
                <span className="h-3 w-24 bg-line/40" style={{ borderRadius: 999 }} />
              </div>
            ))
          ) : error ? (
            <div role="alert" className="px-2 py-2 text-[11px] text-danger">
              {error}
            </div>
          ) : (
            entries.map((e) => (
              <button
                key={e.id}
                type="button"
                role="menuitemradio"
                aria-checked={e.active}
                onClick={() => pick(e.id)}
                className={`flex min-h-[52px] w-full items-center gap-2 px-2 py-1.5 text-left transition ${
                  e.active
                    ? "bg-accent text-accent-ink shadow-theme"
                    : "text-ink hover:bg-surface-2/70"
                }`}
                style={{ borderRadius: 12 }}
              >
                <span
                  aria-hidden
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold ${
                    e.active ? "bg-white/20 text-accent-ink" : "bg-surface-2 text-ink"
                  }`}
                  style={{ borderRadius: 999 }}
                >
                  {e.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="max-w-[140px] truncate text-sm font-bold">{e.name}</span>
                  <span
                    className={`text-[11px] font-medium ${e.active ? "text-accent-ink/80" : "text-muted"}`}
                  >
                    {t["scope.countPlaces"](e.count)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
