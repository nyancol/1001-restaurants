export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parseLimit(raw: unknown): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(n), 1), MAX_LIMIT);
}

export function encodeCursor(updatedAt: number, id: string): string {
  return Buffer.from(`${updatedAt}:${id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: unknown): { updatedAt: number; id: string } | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const s = Buffer.from(raw, "base64url").toString("utf8");
    const i = s.indexOf(":");
    if (i < 0) return null;
    const updatedAt = Number(s.slice(0, i));
    const id = s.slice(i + 1);
    if (!Number.isFinite(updatedAt) || !id) return null;
    return { updatedAt: Math.floor(updatedAt), id };
  } catch {
    return null;
  }
}

export function envelope<T>(data: T[], limit: number, nextCursor: string | null, total: number) {
  return { data, pagination: { limit, nextCursor, total } };
}

export function encodeOffset(offset: number): string {
  return Buffer.from(`o:${offset}`, "utf8").toString("base64url");
}

export function decodeOffset(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw !== "string") return null;
  try {
    const s = Buffer.from(raw, "base64url").toString("utf8");
    if (!s.startsWith("o:")) return null;
    const n = Number.parseInt(s.slice(2), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  } catch {
    return null;
  }
}
