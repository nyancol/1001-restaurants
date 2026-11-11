import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import AddPage from "./pages/AddPage";
import ListPage from "./pages/ListPage";
import { getMe, UnauthorizedError } from "./lib/api";
import ThemeSwitcher from "./theme/ThemeSwitcher";

const MapPage = lazy(() => import("./pages/MapPage"));

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
    return <div className="font-body mx-auto max-w-xl bg-bg px-4 py-10 text-sm text-muted">Loading…</div>;
  }

  if (unauthorized || !user) {
    return (
      <div className="font-body min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Oyster</h1>
          <p className="mt-2 text-sm text-muted">Log in to save and recall your places.</p>
          <button
            type="button"
            onClick={goLogin}
            className="edge radius-input mt-4 border-accent bg-accent px-5 py-2 text-sm font-medium text-accent-ink"
          >
            Log in
          </button>
          {devAvailable && (
            <div className="edge radius-card mx-auto mt-8 max-w-xs border-info-line bg-info-bg p-4 text-left">
              <p className="text-xs font-medium text-info-ink">Development only</p>
              {devError && <p className="mt-1 text-xs text-danger-ink">{devError}</p>}
              <div className="mt-2 flex gap-2">
                <input
                  value={devUser}
                  onChange={(e) => setDevUser(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void devLogin();
                  }}
                  placeholder="dev username"
                  aria-label="dev username"
                  className="radius-input edge min-w-0 flex-1 border-line bg-surface px-2 py-1.5 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => void devLogin()}
                  disabled={devBusy}
                  className="radius-input edge shrink-0 border-accent bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50"
                >
                  {devBusy ? "…" : "Use dev user"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="font-body min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-2">
          <nav className="flex gap-2 text-sm font-medium sm:gap-3">
            <Link to="/" className="radius-input px-2 py-1 hover:bg-surface-2">
              My places
            </Link>
            <Link to="/map" className="radius-input px-2 py-1 hover:bg-surface-2">
              Map
            </Link>
            <Link to="/add" className="edge radius-input border-accent bg-accent px-3 py-1 text-accent-ink">
              + Add
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <ThemeSwitcher />
            <span className="hidden max-w-32 truncate text-muted sm:inline">{user.displayName ?? "me"}</span>
            <button type="button" onClick={logout} className="edge radius-input border-line bg-surface px-2 py-1 text-xs">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ListPage onUnauthorized={() => setUnauthorized(true)} />} />
          <Route
            path="/map"
            element={
              <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-10 text-sm text-muted">Loading map…</div>}>
                <MapPage onUnauthorized={() => setUnauthorized(true)} />
              </Suspense>
            }
          />
          <Route path="/add" element={<AddPage onUnauthorized={() => setUnauthorized(true)} />} />
          <Route path="*" element={<ListPage onUnauthorized={() => setUnauthorized(true)} />} />
        </Routes>
      </main>
    </div>
  );
}
