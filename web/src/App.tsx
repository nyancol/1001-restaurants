import { useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import AddPage from "./pages/AddPage";
import ListPage from "./pages/ListPage";
import { getMe, UnauthorizedError } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<{ id: string; displayName: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      setUnauthorized(false);
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        setUnauthorized(true);
        setUser(null);
      }
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const [devAvailable, setDevAvailable] = useState(false);
  const [devUser, setDevUser] = useState("alice");
  const [devBusy, setDevBusy] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  useEffect(() => {
    // Probe once: the GET probe only exists when DEV_LOGIN is enabled
    // (404 otherwise), so the dev form never shows in production.
    let cancelled = false;
    fetch("/api/auth/dev-login", { credentials: "same-origin" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setDevAvailable(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function devLogin() {
    setDevError(null);
    const name = devUser.trim() || "dev";
    setDevBusy(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: name }),
      });
      if (res.status === 404) {
        setDevAvailable(false);
        setDevError("Dev login is not enabled on this server.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDevError(body?.error ?? `Dev login failed (${res.status}).`);
        return;
      }
      await checkAuth();
    } catch {
      setDevError("Dev login failed — is the server running?");
    } finally {
      setDevBusy(false);
    }
  }

  function goLogin() {
    window.location.href = "/api/auth/login";
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // ignore
    }
    setUser(null);
    setUnauthorized(true);
    navigate("/");
    void checkAuth();
  }

  if (!authChecked) {
    return <div className="mx-auto max-w-xl px-4 py-10 text-sm text-slate-500">Loading…</div>;
  }

  if (unauthorized || !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Oyster</h1>
        <p className="mt-2 text-sm text-slate-600">Log in to save and recall your places.</p>
        <button
          type="button"
          onClick={goLogin}
          className="mt-4 rounded bg-black px-5 py-2 text-sm font-medium text-white"
        >
          Log in
        </button>
        {devAvailable && (
          <div className="mx-auto mt-8 max-w-xs rounded border border-dashed border-amber-400 bg-amber-50 p-4 text-left">
            <p className="text-xs font-medium text-amber-800">Development only</p>
            {devError && <p className="mt-1 text-xs text-red-700">{devError}</p>}
            <div className="mt-2 flex gap-2">
              <input
                value={devUser}
                onChange={(e) => setDevUser(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void devLogin();
                }}
                placeholder="dev username"
                aria-label="dev username"
                className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => void devLogin()}
                disabled={devBusy}
                className="shrink-0 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {devBusy ? "…" : "Use dev user"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2">
          <nav className="flex gap-3 text-sm font-medium">
            <Link to="/" className="rounded px-2 py-1 hover:bg-slate-100">
              My places
            </Link>
            <Link to="/add" className="rounded bg-black px-3 py-1 text-white">
              + Add
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden max-w-32 truncate text-slate-500 sm:inline">
              {user.displayName ?? "me"}
            </span>
            <button type="button" onClick={logout} className="rounded border px-2 py-1 text-xs">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ListPage onUnauthorized={() => setUnauthorized(true)} />} />
          <Route path="/add" element={<AddPage onUnauthorized={() => setUnauthorized(true)} />} />
          <Route path="*" element={<ListPage onUnauthorized={() => setUnauthorized(true)} />} />
        </Routes>
      </main>
    </div>
  );
}
