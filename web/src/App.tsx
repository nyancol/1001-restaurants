import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import AddPage from "./pages/AddPage";
import ListPage from "./pages/ListPage";
import { getMe, UnauthorizedError } from "./lib/api";
import { useMediaQuery } from "./lib/useMediaQuery";
import ThemeSwitcher from "./theme/ThemeSwitcher";

const MapPage = lazy(() => import("./pages/MapPage"));
const SplitPage = lazy(() => import("./pages/SplitPage"));

function SplitFallback() {
  return <div className="mx-auto w-full max-w-[1600px] px-4 py-10 text-sm text-muted lg:px-6">Loading…</div>;
}

function HomeRoute({ onUnauthorized }: { onUnauthorized: () => void }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  if (isDesktop) {
    return (
      <Suspense fallback={<SplitFallback />}>
        <SplitPage onUnauthorized={onUnauthorized} />
      </Suspense>
    );
  }
  return <ListPage onUnauthorized={onUnauthorized} />;
}

function MapRoute({ onUnauthorized }: { onUnauthorized: () => void }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  if (isDesktop) {
    return (
      <Suspense fallback={<SplitFallback />}>
        <SplitPage onUnauthorized={onUnauthorized} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-10 text-sm text-muted">Loading map…</div>}>
      <MapPage onUnauthorized={onUnauthorized} />
    </Suspense>
  );
}

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
    <div className="font-body flex min-h-screen flex-col bg-bg text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2 lg:max-w-[1600px] lg:px-6">
          <Link to="/" className="font-display shrink-0 text-lg font-bold text-ink" aria-label="home">Oyster</Link>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 pl-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-right text-muted" title={user.displayName ?? "me"}>{user.displayName ?? "me"}</span>
            <button type="button" onClick={logout} aria-label="Logout" title="Logout" className="edge radius-input inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center border-line bg-surface px-2 text-xs">
              <span aria-hidden>⏻</span>
              <span className="ml-1 hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomeRoute onUnauthorized={() => setUnauthorized(true)} />} />
          <Route path="/map" element={<MapRoute onUnauthorized={() => setUnauthorized(true)} />} />
          <Route path="/add" element={<AddPage onUnauthorized={() => setUnauthorized(true)} />} />
          <Route path="*" element={<HomeRoute onUnauthorized={() => setUnauthorized(true)} />} />
        </Routes>
      </main>
      <footer className="border-t border-line bg-surface/95">
        <div className="mx-auto flex max-w-xl items-center justify-center px-3 py-3 lg:max-w-[1600px] lg:px-6">
          <ThemeSwitcher />
        </div>
      </footer>
    </div>
  );
}
