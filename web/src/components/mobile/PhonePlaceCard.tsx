import type { Place } from "../../lib/api";
import PlaceCard from "../PlaceCard";

interface Props {
  place: Place;
  selected?: boolean;
  onToggleStatus: (p: Place) => void;
  onEdit: (p: Place) => void;
  onOpen?: (p: Place) => void;
  readOnly?: boolean;
  onRefresh?: (p: Place) => Promise<unknown>;
  refreshing?: boolean;
}

/**
 * Phone list card — same elements as desktop `PlaceCard`,
 * only the outer container uses the Stitch mobile styling.
 * Tapping the card body opens the expanded tasting-notes sheet.
 */
export default function PhonePlaceCard({ place: p, selected, onToggleStatus, onEdit, onOpen, readOnly, onRefresh, refreshing }: Props) {
  return (
    <article
      data-place-id={p.id}
      onClick={(e) => {
        if (!onOpen) return;
        if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
        onOpen(p);
      }}
      className={`p-4 transition ${
        selected ? "border-2 border-accent shadow-theme" : "edge border-line shadow-theme"
      } bg-surface`}
      style={{ borderRadius: 16 }}
    >
      <PlaceCard
        place={p}
        onToggleStatus={onToggleStatus}
        onEdit={onEdit}
        readOnly={readOnly}
        onRefresh={onRefresh}
        refreshing={refreshing}
        hidePhotos
        actionStyle="pills"
      />
    </article>
  );
}
