import TagCombobox from "./TagCombobox";

interface Props {
  status: string;
  setStatus: (s: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  q: string;
  setQ: (q: string) => void;
}

export default function FilterBar({ status, setStatus, tags, setTags, q, setQ }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          aria-label="status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="WANT_TO_GO">Want to go</option>
          <option value="BEEN_TO">Been to</option>
        </select>
        <input
          aria-label="text search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name…"
          className="flex-1 rounded border px-3 py-1.5 text-sm"
        />
        {(status || tags.length || q) && (
          <button
            type="button"
            className="rounded border px-2 py-1.5 text-sm"
            onClick={() => {
              setStatus("");
              setTags([]);
              setQ("");
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-xs text-white">
            {t}
            <button type="button" aria-label={`remove filter ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-600">Filter by tags</summary>
        <div className="mt-2">
          <TagCombobox
            value={tags}
            onChange={(next) => {
              // TagCombobox appends; for filters we replace wholesale.
              setTags(next);
            }}
          />
        </div>
      </details>
    </div>
  );
}
