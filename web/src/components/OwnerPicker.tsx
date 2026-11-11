import { getMe, listUsers, type DirectoryUser } from "../lib/api";
import { useEffect, useState } from "react";

interface Props {
  owner: string;
  setOwner: (s: string) => void;
}

/**
 * Users scope picker (`Me (<name>)`, each other user with place count).
 * Used in FilterBar-adjacent chrome on List, Map, and desktop Split views
 * so the same owner scope drives the shared list-equals-pins fetch.
 */
export default function OwnerPicker({ owner, setOwner }: Props) {
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
  const isSelfId = meId != null && owner === meId;
  const selectValue = isSelfId ? "me" : owner;
  const isKnown = selectValue === "me" || others.some((u) => u.id === selectValue);

  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      Users
      <select
        aria-label="Users scope"
        value={selectValue}
        onChange={(e) => setOwner(e.target.value)}
        disabled={loading && users.length === 0}
        className="edge radius-input min-h-[44px] w-full border-line bg-bg px-2 text-sm text-ink"
      >
        <option value="me">Me{meName ? ` (${meName})` : ""}</option>
        {others.map((u) => (
          <option key={u.id} value={u.id}>
            {u.displayName ?? u.id} ({u.placeCount})
          </option>
        ))}
        {selectValue === "all" && <option value="all">Everyone (legacy)</option>}
        {!isKnown && selectValue !== "all" && (
          <option value={selectValue}>Unknown user ({selectValue.slice(0, 8)})</option>
        )}
      </select>
    </label>
  );
}
