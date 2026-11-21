import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

export default function ViewToggle() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const onMap = pathname === "/map";
  const base = "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-4 text-sm font-semibold";
  return (
    <nav aria-label={t["view.aria"]} className="edge radius-pill flex overflow-hidden border-line bg-surface lg:hidden" style={{ borderRadius: 999 }}>
      <Link
        to="/"
        aria-current={onMap ? undefined : "page"}
        aria-pressed={onMap ? "false" : "true"}
        className={`${base} ${onMap ? "text-muted hover:bg-surface-2" : "bg-accent text-accent-ink"}`}
        style={!onMap ? { borderRadius: 999 } : undefined}
      >
        <span aria-hidden>☰</span> {t["view.list"]}
      </Link>
      <Link
        to="/map"
        aria-current={onMap ? "page" : undefined}
        aria-pressed={onMap ? "true" : "false"}
        className={`${base} ${onMap ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-2"}`}
        style={onMap ? { borderRadius: 999 } : undefined}
      >
        <span aria-hidden>🗺</span> {t["view.map"]}
      </Link>
    </nav>
  );
}
