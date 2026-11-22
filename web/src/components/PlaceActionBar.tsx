import { useEffect, useRef, useState } from "react";
import { mapsUrlFor, type Place } from "../lib/api";
import { useLanguage, type Dict } from "../i18n/LanguageContext";

interface Props {
  place: Place;
  onEdit: (p: Place) => void;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
  readOnly?: boolean;
}

export function refreshErrorMessage(err: any, googlePlaceId: string | null, t: Dict): string {
  const status = err?.status;
  if (status === 422 || (!googlePlaceId && !status)) return t["card.noGoogle"];
  if (status === 429) return t["card.rateLimited"];
  if (status === 503 || status === 502) return t["card.googleUnavailable"];
  if (status === 403) return t["card.notAllowed"];
  return err?.message ?? t["card.refreshFailed"];
}

/**
 * Unified phone action bar (list cards + map sheet): primary Edit,
 * secondary Share, secondary Refresh — all in the map-sheet button design.
 * Read-only renders Share only (Edit/Refresh would mutate someone else's place).
 */
export default function PlaceActionBar({
  place: p,
  onEdit,
  onRefresh,
  refreshing,
  readOnly,
}: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [busyLocal, setBusyLocal] = useState(false);
  const copyTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );
  useEffect(() => {
    setCopied(false);
    setRefreshError(null);
  }, [p.id]);

  const busy = (refreshing ?? false) || busyLocal;
  const shareUrl = mapsUrlFor(p);
  const showRefresh = !readOnly && onRefresh != null;
  if (readOnly && !shareUrl) return null;
  const visibleCount = (!readOnly ? 1 : 0) + (shareUrl ? 1 : 0) + (showRefresh ? 1 : 0);

  async function share() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      let fallbackOk = false;
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        fallbackOk = document.execCommand("copy"); // deprecated legacy API
        ta.remove();
      } catch {
        fallbackOk = false;
      }
      if (!fallbackOk) return; // copy failed — don't show the "Copied ✓" state
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleRefresh() {
    if (busy || !onRefresh) return;
    if (!p.googlePlaceId) {
      setRefreshError(t["card.noGoogle"]);
      return;
    }
    setRefreshError(null);
    setBusyLocal(true);
    try {
      await onRefresh(p);
    } catch (err: any) {
      setRefreshError(refreshErrorMessage(err, p.googlePlaceId, t));
    } finally {
      setBusyLocal(false);
    }
  }

  const secondary =
    "edge inline-flex min-h-[52px] min-w-0 items-center justify-center gap-1.5 border-line bg-surface-2/60 px-3 text-base font-bold text-ink disabled:opacity-50";

  return (
    <div className="w-full">
      <div
        className={`grid gap-2 ${visibleCount >= 3 ? "grid-cols-3" : visibleCount === 2 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {!readOnly && (
          <button
            type="button"
            onClick={() => onEdit(p)}
            aria-label={t["card.edit"]}
            title={t["card.edit"]}
            className="edge inline-flex min-h-[52px] min-w-0 items-center justify-center gap-2 border-accent bg-accent px-3 text-base font-bold text-accent-ink"
            style={{ borderRadius: 12 }}
          >
            <span aria-hidden>✎</span> {t["card.edit"]}
          </button>
        )}
        {shareUrl && (
          <button
            type="button"
            onClick={() => void share()}
            aria-label={t["card.shareAria"]}
            title={copied ? t["card.copied"] : t["card.share"]}
            className={secondary}
            style={{ borderRadius: 12 }}
          >
            <span aria-hidden>{copied ? "✓" : "⤴"}</span> {t["card.sharePill"] ?? "Share"}
          </button>
        )}
        {showRefresh && (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={busy || !p.googlePlaceId}
            title={!p.googlePlaceId ? t["card.noGoogle"] : t["card.refreshTitle"]}
            aria-label={busy ? t["card.refreshingAria"] : t["card.refreshAria"]}
            className={secondary}
            style={{ borderRadius: 12 }}
          >
            <span aria-hidden className={busy ? "animate-spin inline-block" : "inline-block"}>
              ↻
            </span>{" "}
            {t["card.refreshCta"]}
          </button>
        )}
      </div>
      {refreshError && (
        <div
          className="edge radius-input mt-2 border-danger-line bg-danger-bg px-2 py-1 text-xs text-danger-ink"
          role="alert"
        >
          {refreshError}
        </div>
      )}
      {copied && (
        <div
          className="edge radius-input mt-2 border-been bg-been px-2 py-1 text-xs font-semibold text-been-ink"
          role="status"
        >
          ✓ {t["card.copiedLive"]}
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {copied ? t["card.copiedLive"] : ""}
      </div>
    </div>
  );
}
