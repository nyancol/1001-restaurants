import { useLanguage } from "../i18n/LanguageContext";
import { ICONS } from "../theme/pins";
import IconGlyph from "./IconGlyph";

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: Props) {
  const { t } = useLanguage();
  // Same normalization contract as IconGlyph / pins.ts: trim + lowercase + default.
  const current = (value ?? "fork").trim().toLowerCase() || "fork";
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">{t["icon.label"] ?? "Icon"}</span>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={t["icon.aria"] ?? "place icon"}
      >
        {ICONS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={current === id}
            aria-label={t[`icon.${id}`] ?? id}
            title={t[`icon.${id}`] ?? id}
            onClick={() => onChange(id)}
            className={`edge radius-pill inline-flex min-h-[48px] min-w-[48px] items-center justify-center px-3 ${current === id ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink"}`}
          >
            <IconGlyph id={id} size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}
