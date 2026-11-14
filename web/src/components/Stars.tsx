interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
}

import { useLanguage } from "../i18n/LanguageContext";

export default function Stars({ value, onChange }: Props) {
  const { t } = useLanguage();
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">{t["stars.label"]}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={t["stars.aria"]}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t["stars.star"](n)}
            className={`text-2xl leading-none ${value != null && n <= value ? "text-star" : "text-star-idle"}`}
            onClick={() => onChange(value === n ? null : n)}
          >
            ★
          </button>
        ))}
        {value != null && (
          <button type="button" className="ml-2 text-sm text-muted underline hover:text-ink" onClick={() => onChange(null)}>
            {t["stars.clear"]}
          </button>
        )}
      </div>
    </div>
  );
}
