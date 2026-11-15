import { useEffect, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  title: string;
  placeName: string;
  body: string;
  warning: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-action confirmation dialog.
 * Themed via contract vars (`edge`, `radius-card`, `shadow-theme`,
 * `danger-*`), so XP / Retro / light / dark all pick it up.
 * Accessible: `alertdialog`, Escape + backdrop close, initial focus on
 * the safe action, body scroll locked while open.
 */
export default function ConfirmDialog({
  title,
  placeName,
  body,
  warning,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useLanguage();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      // Lightweight focus containment: keep Tab inside the panel.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const list = [...focusables].filter((el) => !el.hasAttribute("disabled"));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label={t["editor.deleteCancel"] ?? cancelLabel}
        onClick={onCancel}
        className="dialog-backdrop absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-body"
        className="dialog-panel edge radius-card relative w-full max-w-sm border-line bg-surface p-5 pt-4 shadow-theme"
      >
        {/* Danger top accent */}
        <div aria-hidden className="radius-pill absolute inset-x-5 top-2 h-1 bg-danger-ink/70" />
        <div className="mt-2 flex items-start gap-3">
          <span
            aria-hidden
            className="edge radius-pill inline-flex h-11 w-11 shrink-0 items-center justify-center border-danger-line bg-danger-bg text-xl text-danger-ink"
          >
            🗑️
          </span>
          <div className="min-w-0">
            <h2 id="confirm-delete-title" className="font-display text-lg font-semibold leading-tight text-ink">
              {title}
            </h2>
            <p className="mt-0.5 truncate text-sm font-medium text-ink" title={placeName}>
              « {placeName} »
            </p>
          </div>
        </div>

        <p id="confirm-delete-body" className="mt-3 text-sm leading-relaxed text-muted">
          {body}
        </p>
        <p className="edge radius-pill mt-3 inline-flex items-center gap-1.5 border-danger-line bg-danger-bg px-2.5 py-1 text-xs font-medium text-danger-ink">
          <span aria-hidden>⚠️</span> {warning}
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="edge radius-input min-h-[44px] flex-1 border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface-2 disabled:opacity-50 sm:flex-none sm:px-5"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="edge radius-input inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 border-danger-line bg-danger-bg px-4 py-2 text-sm font-semibold text-danger-ink transition hover:brightness-95 active:brightness-90 disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-5"
          >
            {pending ? (
              <>
                <span aria-hidden className="dialog-spinner inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
                {pendingLabel}
              </>
            ) : (
              <>
                <span aria-hidden>🗑️</span> {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
