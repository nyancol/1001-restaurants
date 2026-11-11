export interface DayTime { day: number; hour: number; minute: number }
export interface HoursPeriod { open?: DayTime | null; close?: DayTime | null }

function toMinutes(d: DayTime): number {
  return d.day * 24 * 60 + d.hour * 60 + d.minute;
}

/** True when periods cover `at` (local minutes). Handles overnight spans.
 * Google day numbering: 0=Sunday, 1=Monday, ... 6=Saturday (matches JS getDay()). */
export function isOpenAt(periods: HoursPeriod[] | null | undefined, at: Date): boolean {
  if (!Array.isArray(periods) || !periods.length) return false;
  const day = at.getDay(); // 0=Sunday, matches Google Period.day
  const nowMin = day * 24 * 60 + at.getHours() * 60 + at.getMinutes();
  for (const p of periods) {
    if (!p?.open) continue;
    const openMin = toMinutes(p.open);
    if (!p.close) return true; // 24h
    let closeMin = toMinutes(p.close);
    if (closeMin <= openMin) closeMin += 24 * 60; // overnight within period
    // Also consider weekly wrap: test now and now +/- week for spans crossing Sunday.
    if ((nowMin >= openMin && nowMin < closeMin) || (nowMin + 7 * 24 * 60 >= openMin && nowMin + 7 * 24 * 60 < closeMin)) {
      return true;
    }
  }
  return false;
}

export function parseHoursJson(raw: unknown): { periods: HoursPeriod[]; weekdayDescriptions: string[] } | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v?.periods)) return { periods: v.periods as HoursPeriod[], weekdayDescriptions: v.weekdayDescriptions ?? [] };
    if (Array.isArray(v)) return { periods: v as HoursPeriod[], weekdayDescriptions: [] };
    return null;
  } catch {
    return null;
  }
}
