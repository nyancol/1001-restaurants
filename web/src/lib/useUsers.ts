import { useEffect, useState } from "react";
import { getMe, listUsers, type DirectoryUser } from "./api";

export interface UsersState {
  me: { id: string; displayName: string | null } | null;
  users: DirectoryUser[];
  loading: boolean;
  error: string | null;
}

export function useUsers(): UsersState {
  const [me, setMe] = useState<{ id: string; displayName: string | null } | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [meData, userList] = await Promise.all([getMe(), listUsers()]);
        if (cancelled) return;
        setMe(meData);
        setUsers(userList);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { me, users, loading, error };
}

export function displayNameFor(owner: string, me: UsersState["me"], users: DirectoryUser[]): string | null {
  if (owner === "me") return me?.displayName ?? "Me";
  if (owner === "all") return "Everyone";
  const found = users.find((u) => u.id === owner);
  return found ? (found.displayName ?? found.id) : null;
}
