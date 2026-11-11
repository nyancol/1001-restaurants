import { Link, useLocation } from "react-router-dom";

export default function ViewToggle() {
  const { pathname } = useLocation();
  const onMap = pathname === "/map";
  const base = "inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 px-4 text-sm font-medium";
  return (
    <nav aria-label="view" className="edge radius-pill flex overflow-hidden border-line lg:hidden">
      <Link
        to="/"
        aria-current={onMap ? undefined : "page"}
        aria-pressed={onMap ? "false" : "true"}
        className={`${base} ${onMap ? "bg-surface text-muted hover:bg-surface-2" : "bg-accent text-accent-ink"}`}
      >
        <span aria-hidden>☰</span> List
      </Link>
      <Link
        to="/map"
        aria-current={onMap ? "page" : undefined}
        aria-pressed={onMap ? "true" : "false"}
        className={`${base} ${onMap ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-surface-2"}`}
      >
        <span aria-hidden>🗺</span> Map
      </Link>
    </nav>
  );
}
