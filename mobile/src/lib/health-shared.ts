import { daysAgo, dkey, nightKey } from './dates';
import type { HealthDay, HealthWorkout } from './types';

export interface SleepPiece {
  start: Date;
  end: Date;
  source: string;
  stage: 'asleep' | 'deep' | 'rem';
}

export interface PointSample {
  at: Date;
  value: number;
}

/**
 * Rolls raw samples up into one HealthDay per date. Several apps (Whoop, Garmin,
 * the phone itself) can all write sleep for the same night, so sleep is taken
 * from whichever source recorded the most of it rather than summed.
 */
export function buildDays(
  days: number,
  input: {
    sleep: SleepPiece[];
    hrv: PointSample[];
    restingHR: PointSample[];
    steps: Record<string, number>;
    workouts: HealthWorkout[];
  },
): Record<string, HealthDay> {
  const out: Record<string, HealthDay> = {};
  const keys = Array.from({ length: days }, (_, i) => dkey(daysAgo(i)));
  for (const k of keys) out[k] = { workouts: [] };

  const bySource: Record<string, Record<string, { spans: [number, number][]; deep: number; rem: number }>> = {};
  for (const p of input.sleep) {
    const k = nightKey(p.end);
    if (!out[k]) continue;
    const min = (p.end.getTime() - p.start.getTime()) / 60000;
    if (min <= 0) continue;
    const slot = ((bySource[k] ??= {})[p.source] ??= { spans: [], deep: 0, rem: 0 });
    slot.spans.push([p.start.getTime(), p.end.getTime()]);
    if (p.stage === 'deep') slot.deep += min;
    if (p.stage === 'rem') slot.rem += min;
  }
  for (const [k, sources] of Object.entries(bySource)) {
    // Some apps write a whole-night record plus stage records, so overlapping time
    // within one source is merged rather than added.
    const best = Object.values(sources)
      .map((s) => ({ ...s, total: unionMinutes(s.spans) }))
      .sort((a, b) => b.total - a.total)[0];
    if (best && best.total >= 60) {
      out[k].sleepHours = Math.round((best.total / 60) * 10) / 10;
      if (best.deep) out[k].deepMin = Math.round(best.deep);
      if (best.rem) out[k].remMin = Math.round(best.rem);
    }
  }

  const hrvByDay: Record<string, number[]> = {};
  for (const s of input.hrv) (hrvByDay[dkey(s.at)] ??= []).push(s.value);
  for (const [k, vals] of Object.entries(hrvByDay)) {
    if (out[k]) out[k].hrv = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  for (const s of [...input.restingHR].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const k = dkey(s.at);
    if (out[k]) out[k].restingHR = Math.round(s.value);
  }

  for (const [k, n] of Object.entries(input.steps)) if (out[k]) out[k].steps = Math.round(n);

  for (const w of input.workouts) {
    const k = dkey(new Date(w.start));
    if (out[k]) out[k].workouts.push(w);
  }
  for (const k of keys) out[k].workouts.sort((a, b) => b.start.localeCompare(a.start));

  return out;
}

function unionMinutes(spans: [number, number][]): number {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = sorted[0] ?? [0, 0];
  for (const [s, e] of sorted.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  return (total + ce - cs) / 60000;
}

export const minutesBetween =(a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

/** Converts a distance quantity to kilometres; unknown units are dropped. */
export function toKm(q?: { quantity: number; unit: string }): number | undefined {
  if (!q) return undefined;
  const f: Record<string, number> = { m: 0.001, km: 1, mi: 1.609344, ft: 0.0003048, yd: 0.0009144 };
  return f[q.unit] != null ? Math.round(q.quantity * f[q.unit] * 100) / 100 : undefined;
}

/** Converts an energy quantity to kilocalories; unknown units are dropped. */
export function toKcal(q?: { quantity: number; unit: string }): number | undefined {
  if (!q) return undefined;
  const f: Record<string, number> = { kcal: 1, Cal: 1, cal: 0.001, kJ: 0.239006, J: 0.000239006 };
  return f[q.unit] != null ? Math.round(q.quantity * f[q.unit]) : undefined;
}
