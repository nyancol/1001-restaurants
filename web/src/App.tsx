import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import AddPage from "./pages/AddPage";
import ListPage from "./pages/ListPage";
import { getMe, UnauthorizedError } from "./lib/api";
import { useMediaQuery } from "./lib/useMediaQuery";
import LanguageSwitcher from "./i18n/LanguageSwitcher";
import { useLanguage } from "./i18n/LanguageContext";

const MapPage = lazy(() => import("./pages/MapPage"));
const SplitPage = lazy(() => import("./pages/SplitPage"));

function SplitFallback() {
  const { t } = useLanguage();
  return <div className="mx-auto w-full max-w-[1600px] px-4 py-10 text-sm text-muted lg:px-6">{t["app.splitLoading"]}</div>;
}

function MapFallback() {
  const { t } = useLanguage();
  return <div className="mx-auto max-w-xl px-4 py-10 text-sm text-muted">{t["app.loading"]}</div>;
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
    <Suspense fallback={<MapFallback />}>
      <MapPage onUnauthorized={onUnauthorized} />
    </Suspense>
  );
}

export default function App() {
  const { t } = useLanguage();
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
        setDevError(t["app.devDisabled"]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDevError(body?.error ?? `Dev login failed (${res.status}).`);
        return;
      }
      await checkAuth();
    } catch {
      setDevError(t["app.devFailed"]);
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
    return <div className="font-body mx-auto max-w-xl bg-bg px-4 py-10 text-sm text-muted">{t["app.loading"]}</div>;
  }

  if (unauthorized || !user) {
    return (
      <div className="font-body min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">{t["app.title"]}</h1>
          <p className="mt-2 text-sm text-muted">{t["app.loginSubtitle"]}</p>
          <button
            type="button"
            onClick={goLogin}
            className="edge radius-input mt-4 border-accent bg-accent px-5 py-2 text-sm font-medium text-accent-ink"
          >
            {t["app.login"]}
          </button>
          {devAvailable && (
            <div className="edge radius-card mx-auto mt-8 max-w-xs border-info-line bg-info-bg p-4 text-left">
              <p className="text-xs font-medium text-info-ink">{t["app.devTitle"]}</p>
              {devError && <p className="mt-1 text-xs text-danger-ink">{devError}</p>}
              <div className="mt-2 flex gap-2">
                <input
                  value={devUser}
                  onChange={(e) => setDevUser(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void devLogin();
                  }}
                  placeholder={t["app.devPlaceholder"]}
                  aria-label={t["app.devPlaceholder"]}
                  className="radius-input edge min-w-0 flex-1 border-line bg-surface px-2 py-1.5 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => void devLogin()}
                  disabled={devBusy}
                  className="radius-input edge shrink-0 border-accent bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50"
                >
                  {devBusy ? "…" : t["app.devUse"]}
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
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={t["app.homeAria"]}>
            <span className="edge radius-pill inline-flex h-10 w-10 items-center justify-center border-line bg-surface-2 text-lg" aria-hidden style={{ borderRadius: 999 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 10h16v2a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8v-2Z" />
                <path d="M9 10V5.5a1.5 1.5 0 0 1 3 0V10" />
                <path d="M12 20v1" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="font-display block text-[22px] font-semibold tracking-tight text-ink">{t["app.title"]}</span>
              <span className="block text-xs text-muted">Personal dining journal &amp; shared taste</span>
            </span>
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2.5 pl-2">
            <Link
              to="/add"
              className="edge inline-flex min-h-[44px] shrink-0 items-center gap-1.5 border-accent bg-accent px-4 text-sm font-semibold text-accent-ink shadow-theme"
              style={{ borderRadius: 999 }}
            >
              <span aria-hidden>🍴</span> + New Memory
            </Link>
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="edge relative inline-flex h-10 w-10 shrink-0 items-center justify-center border-line bg-surface text-ink"
              style={{ borderRadius: 999 }}
            >
              <span aria-hidden>🔔</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" aria-hidden />
            </button>
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <span className="edge inline-flex h-9 w-9 shrink-0 items-center justify-center border-line bg-surface-2 text-xs font-bold text-ink" style={{ borderRadius: 999 }} aria-hidden>
                {(user.displayName ?? "C").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden min-w-0 leading-tight md:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold text-ink" title={user.displayName ?? t["app.meFallback"]}>{user.displayName ?? t["app.meFallback"]}</span>
                <span className="block text-[11px] text-muted">Paris • journal</span>
              </span>
            </div>
            <button type="button" onClick={logout} aria-label={t["app.logout"]} title={t["app.logout"]} className="edge radius-input inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center border-line bg-surface px-2 text-xs text-muted hover:text-ink">
              <span aria-hidden>⏻</span>
              <span className="ml-1 hidden xl:inline">{t["app.logout"]}</span>
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
      <footer className="border-t border-line bg-surface-2/60">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-sm lg:px-8">
          <span className="font-display text-base font-semibold text-ink">{t["app.title"]}</span>
          <span className="text-muted">— A mindful compendium of memorable tables and culinary wanderlust.</span>
          <span className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted">
            <a href="#/" className="hover:text-ink hover:underline">Neighborhood Guides</a>
            <a href="#/" className="hover:text-ink hover:underline">Tasting Notes Index</a>
            <a href="#/" className="hover:text-ink hover:underline">Cellar &amp; Wine Logs</a>
            <span>© 2024 {t["app.title"]}</span>
          </span>
          <span className="flex w-full items-center gap-2 pt-1">
            <LanguageSwitcher />
          </span>
        </div>
      </footer>
    </div>
  );
}
