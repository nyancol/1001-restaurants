import { useEffect, useState } from "react";
import { getMe, listUsers, type DirectoryUser } from "./api";
import { useLanguage } from "../i18n/LanguageContext";

export interface UsersState {
  me: { id: string; displayName: string | null } | null;
  users: DirectoryUser[];
  loading: boolean;
  error: string | null;
}

export function useUsers(): UsersState {
  const { t } = useLanguage();
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
        setError(err?.message ?? t["error.loadUsers"]);
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

export function displayNameFor(owner: string, me: UsersState["me"], users: DirectoryUser[], fallback?: { me: string; everyone: string }): string | null {
  const fb = fallback ?? (typeof document !== "undefined" && document.documentElement.lang === "fr" ? { me: "Moi", everyone: "Tout le monde" } : { me: "Me", everyone: "Everyone" });
  if (owner === "me") return me?.displayName ?? fb.me;
  if (owner === "all") return fb.everyone;
  const found = users.find((u) => u.id === owner);
  return found ? (found.displayName ?? found.id) : null;
}
