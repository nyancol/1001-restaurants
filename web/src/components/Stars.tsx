interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
}

export default function Stars({ value, onChange }: Props) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">Stars</span>
      <div className="flex gap-1" role="radiogroup" aria-label="rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={`text-2xl leading-none ${value != null && n <= value ? "text-amber-500" : "text-slate-300"}`}
            onClick={() => onChange(value === n ? null : n)}
          >
            ★
          </button>
        ))}
        {value != null && (
          <button
            type="button"
            className="ml-2 text-sm text-slate-500 underline"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
