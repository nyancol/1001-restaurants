interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
}

export default function Stars({ value, onChange }: Props) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">Stars</span>
      <div className="flex gap-1" role="radiogroup" aria-label="rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={`text-2xl leading-none ${value != null && n <= value ? "text-star" : "text-star-idle"}`}
            onClick={() => onChange(value === n ? null : n)}
          >
            ★
          </button>
        ))}
        {value != null && (
          <button type="button" className="ml-2 text-sm text-muted underline hover:text-ink" onClick={() => onChange(null)}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
