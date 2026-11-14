import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  value: string;
  onChange: (t: string) => void;
}

const OPTIONS = [
  { value: "restaurant", label: "🍴 restaurant" },
  { value: "bar", label: "🍸 bar" },
  { value: "café", label: "☕ café" },
  { value: "bakery", label: "🥖 bakery" },
];

export default function TypeCombobox({ value, onChange }: Props) {
  const { t } = useLanguage();
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">{t["type.label"]}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t["type.aria"]}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`edge radius-pill px-4 py-1.5 text-sm font-medium ${value === o.value ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
