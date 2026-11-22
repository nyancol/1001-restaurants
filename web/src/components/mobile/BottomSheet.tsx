import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

/** Shared phone bottom-sheet shell: slide-up animation + drag handle to dismiss. */
export default function BottomSheet({ open, onClose, ariaLabel, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startY: 0, curY: 0, dragging: false });
  const closeTimer = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
      setMounted(true);
      setDragY(0);
      let openCancelled = false;
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!openCancelled) setShown(true);
        });
      });
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCloseRef.current();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        openCancelled = true;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    } else if (mounted) {
      setShown(false);
      setDragY(0);
      setDragging(false);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setMounted(false), 340);
      document.body.style.overflow = "";
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(
    () => () => {
      document.body.style.overflow = "";
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  function onDragStart(clientY: number) {
    dragRef.current = { startY: clientY, curY: clientY, dragging: true };
    setDragging(true);
  }
  function onDragMove(clientY: number) {
    if (!dragRef.current.dragging) return;
    dragRef.current.curY = clientY;
    setDragY(Math.max(0, clientY - dragRef.current.startY));
  }
  function onDragEnd() {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setDragging(false);
    const dy = dragRef.current.curY - dragRef.current.startY;
    if (dy > 110) {
      setShown(false);
      setDragY(window.innerHeight);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        onCloseRef.current();
      }, 220);
    } else {
      setDragY(0);
    }
  }

  if (!mounted) return null;

  const sheetTransform = shown ? `translateY(${dragY}px)` : `translateY(100%)`;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: shown && !dragging ? 1 : dragging ? Math.max(0, 1 - dragY / 500) : 0 }}
      />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden bg-[#fff8e8] shadow-theme will-change-transform"
        style={{
          borderRadius: "24px 24px 0 0",
          transform: sheetTransform,
          transition: dragging ? "none" : "transform 340ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="cursor-grab touch-none select-none px-4 py-3 active:cursor-grabbing"
          onPointerDown={(e) => {
            try {
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            } catch {
              // ignore capture failures; drag still tracks via move/up handlers
            }
            onDragStart(e.clientY);
          }}
          onPointerMove={(e) => onDragMove(e.clientY)}
          onPointerUp={() => onDragEnd()}
          onPointerCancel={() => onDragEnd()}
          role="button"
          tabIndex={0}
          aria-label="Drag down to close"
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-ink/25" aria-hidden />
        </div>
        {children}
      </div>
    </div>
  );
}
