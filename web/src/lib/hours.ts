import type { Place } from "./api";

export interface DayTime { day: number; hour: number; minute: number }
export interface HoursPeriod { open?: DayTime | null; close?: DayTime | null }

const DAY_NAMES: string[][] = [
  ["sunday", "sun", "dimanche", "dim"],
  ["monday", "mon", "lundi", "lun"],
  ["tuesday", "tue", "tues", "mardi", "mar"],
  ["wednesday", "wed", "mercredi", "mer"],
  ["thursday", "thu", "thur", "thurs", "jeudi", "jeu"],
  ["friday", "fri", "vendredi", "ven"],
  ["saturday", "sat", "samedi", "sam"],
];

const DAY_LABELS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_LABELS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function toMinutes(d: DayTime): number {
  return d.day * 24 * 60 + d.hour * 60 + d.minute;
}

/** True when periods cover `at`. Mirrors server `isOpenAt` (Google day numbering). */
export function isOpenAtPeriods(periods: HoursPeriod[] | null | undefined, at: Date): boolean {
  if (!Array.isArray(periods) || !periods.length) return false;
  const day = at.getDay();
  const nowMin = day * 24 * 60 + at.getHours() * 60 + at.getMinutes();
  for (const p of periods) {
    if (!p?.open) continue;
    const openMin = toMinutes(p.open);
    if (!p.close) return true;
    let closeMin = toMinutes(p.close);
    if (closeMin <= openMin) closeMin += 24 * 60;
    if (
      (nowMin >= openMin && nowMin < closeMin) ||
      (nowMin + 7 * 24 * 60 >= openMin && nowMin + 7 * 24 * 60 < closeMin)
    ) {
      return true;
    }
  }
  return false;
}

function rawHours(p: Place): { periods?: HoursPeriod[]; weekdayDescriptions?: string[] } | null {
  const h = p.hours as any;
  if (!h) return null;
  if (typeof h === "string") {
    try {
      const v = JSON.parse(h);
      if (Array.isArray(v?.periods)) return v;
      if (Array.isArray(v)) return { periods: v };
    } catch {
      return null;
    }
    return null;
  }
  return h;
}

/** Open-now status; null when hours data is absent. */
export function openNowFor(p: Place, at = new Date()): boolean | null {
  const h = rawHours(p);
  const periods = h?.periods;
  if (!periods || !periods.length) return null;
  return isOpenAtPeriods(periods, at);
}

export interface WeekRow {
  dayIndex: number;
  dayLabel: string;
  hoursText: string;
  isToday: boolean;
}

function dayIndexFor(name: string): number {
  const low = name.trim().toLowerCase();
  for (let i = 0; i < DAY_NAMES.length; i++) {
    if (DAY_NAMES[i].some((n) => low.startsWith(n) || low.includes(n))) return i;
  }
  return -1;
}

/** Week rows sorted Monday→Sunday, with today's row flagged. Empty when no descriptions. */
export function weekRowsFor(p: Place, locale?: string): WeekRow[] {
  const h = rawHours(p);
  const descs = h?.weekdayDescriptions;
  if (!Array.isArray(descs) || !descs.length) return [];
  const today = new Date().getDay();
  const fr = (locale ?? (typeof document !== "undefined" ? document.documentElement.lang : ""))?.toLowerCase().startsWith("fr");
  const labels = fr ? DAY_LABELS_FR : DAY_LABELS_EN;
  const rows: WeekRow[] = descs.map((d) => {
    const text = String(d ?? "");
    const colon = text.indexOf(":");
    const name = colon >= 0 ? text.slice(0, colon).trim() : text.trim();
    const hoursText = colon >= 0 ? text.slice(colon + 1).trim() : "";
    const idx = dayIndexFor(name);
    return { dayIndex: idx, dayLabel: idx >= 0 ? labels[idx] : name, hoursText, isToday: idx === today };
  });
  rows.sort((a, b) => {
    const order = (i: number) => (i <= 0 ? i + 7 : i); // Monday first
    return order(a.dayIndex) - order(b.dayIndex);
  });
  return rows;
}
