interface Props {
  value: string;
  onChange: (t: string) => void;
}

const OPTIONS = [
  { value: "restaurant", label: "🍴 restaurant" },
  { value: "bar", label: "🍸 bar" },
  { value: "café", label: "☕ café" },
];

export default function TypeCombobox({ value, onChange }: Props) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">Type *</span>
      <div className="flex gap-2" role="radiogroup" aria-label="place type">
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
