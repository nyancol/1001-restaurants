import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

export default function ViewToggle() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const onMap = pathname === "/map";
  // "/add" (and other non-toggle routes) render neither view, so neither
  // button should be marked as the current page.
  const onList = pathname === "/";
  return (
    <nav
      aria-label={t["view.aria"]}
      className="edge flex gap-0.5 border-line bg-surface-2/60 p-0.5 lg:hidden"
      style={{ borderRadius: 999 }}
    >
      <Link
        to="/"
        aria-current={onList ? "page" : undefined}
        aria-pressed={onList ? "true" : "false"}
        className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 px-3 text-xs font-bold transition ${
          onList ? "bg-surface text-accent shadow-theme" : "text-muted hover:text-ink"
        }`}
        style={{ borderRadius: 999 }}
      >
        <span aria-hidden>☰</span> {t["view.list"]}
      </Link>
      <Link
        to="/map"
        aria-current={onMap ? "page" : undefined}
        aria-pressed={onMap ? "true" : "false"}
        className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 px-3 text-xs font-bold transition ${
          onMap ? "bg-surface text-accent shadow-theme" : "text-muted hover:text-ink"
        }`}
        style={{ borderRadius: 999 }}
      >
        <span aria-hidden>🗺</span> {t["view.map"]}
      </Link>
    </nav>
  );
}
