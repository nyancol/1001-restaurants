import { getMe, listUsers, type DirectoryUser } from "../lib/api";
import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  owner: string;
  setOwner: (s: string) => void;
}

/**
 * Journal scope picker: Me / Friends segmented with counts + friend select.
 * Preserves owner=me|<userId> contract shared by list+map fetch.
 */
export default function OwnerPicker({ owner, setOwner }: Props) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, list] = await Promise.all([
          getMe().catch(() => null),
          listUsers().catch(() => [] as DirectoryUser[]),
        ]);
        if (cancelled) return;
        if (me) {
          setMeId(me.id);
          setMeName(me.displayName ?? null);
        }
        setUsers(list);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const others = meId ? users.filter((u) => u.id !== meId) : users;
  const meCount = meId ? (users.find((u) => u.id === meId)?.placeCount ?? 0) : 0;
  const friendsCount = others.reduce((n, u) => n + (u.placeCount ?? 0), 0);
  const isSelfId = meId != null && owner === meId;
  const isMe = owner === "me" || isSelfId;
  const isFriends = !isMe;
  const selectValue = isSelfId ? "me" : owner;
  const isKnown = selectValue === "me" || others.some((u) => u.id === selectValue);

  function pickMe() {
    setOwner("me");
  }
  function pickFriends() {
    if (others.length > 0) setOwner(others[0].id);
    else setOwner("all");
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="edge grid grid-cols-2 overflow-hidden border-line bg-surface-2/60 p-1"
        style={{ borderRadius: 999 }}
        role="group"
        aria-label={t["owner.scopeAria"]}
      >
        <button
          type="button"
          onClick={pickMe}
          aria-pressed={isMe}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-sm font-semibold ${isMe ? "bg-accent text-accent-ink shadow-theme" : "text-muted hover:text-ink"}`}
          style={{ borderRadius: 999 }}
        >
          <span aria-hidden>👤</span> {t["scope.me"]}
          <span className={`inline-flex min-h-[22px] min-w-[22px] items-center justify-center px-1.5 text-[11px] font-bold ${isMe ? "bg-white/20 text-accent-ink" : "bg-surface text-muted"}`} style={{ borderRadius: 999 }}>
            {loading ? "…" : meCount}
          </span>
        </button>
        <button
          type="button"
          onClick={pickFriends}
          aria-pressed={isFriends}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-sm font-semibold ${isFriends ? "bg-accent text-accent-ink shadow-theme" : "text-muted hover:text-ink"}`}
          style={{ borderRadius: 999 }}
        >
          <span aria-hidden>👥</span> Friends
          <span className={`inline-flex min-h-[22px] min-w-[22px] items-center justify-center px-1.5 text-[11px] font-bold ${isFriends ? "bg-white/20 text-accent-ink" : "bg-surface text-muted"}`} style={{ borderRadius: 999 }}>
            {loading ? "…" : (others.length || friendsCount)}
          </span>
        </button>
      </div>
      {isFriends && (
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span className="font-semibold uppercase tracking-wide">Friend</span>
          <select
            aria-label={t["owner.scopeAria"]}
            value={selectValue}
            onChange={(e) => setOwner(e.target.value)}
            disabled={loading && users.length === 0}
            className="edge radius-input min-h-[44px] w-full border-line bg-surface px-2 text-sm text-ink"
          >
            {others.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName ?? u.id} ({u.placeCount})
              </option>
            ))}
            {selectValue === "all" && <option value="all">{t["owner.everyoneLegacy"]}</option>}
            {!isKnown && selectValue !== "all" && (
              <option value={selectValue}>{t["owner.unknownUser"](selectValue)}</option>
            )}
          </select>
        </label>
      )}
      {isMe && (
        <span className="sr-only" aria-live="polite">
          {t["owner.meWithName"](meName)}
        </span>
      )}
    </div>
  );
}
