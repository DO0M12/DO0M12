import { daysAgo, dkey, fmtH, fromKey } from './dates';
import type { Data, DayLog, HealthDay } from './types';

export type RingId = 'readiness' | 'execution' | 'activity';

export interface Contributor {
  n: string;
  /** 0..1, or null when there is nothing to score. */
  v: number | null;
  w: number;
  txt: string;
}

export interface Score {
  rows: Contributor[];
  score: number | null;
}

export const EMPTY_DAY: DayLog = { water: 0, breaks: 0, focus: 0, workout: false, habits: [] };

export const dayOf = (data: Data, k: string): DayLog => data.days[k] ?? EMPTY_DAY;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Average of a health metric over the 7 days before `k`. */
export function baseline(data: Data, k: string, field: 'hrv' | 'restingHR' | 'sleepHours'): number | null {
  const vals: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const v = data.days[dkey(daysAgo(i, fromKey(k)))]?.health?.[field];
    if (typeof v === 'number') vals.push(v);
  }
  return vals.length >= 3 ? (avg(vals) as number) : null;
}

/** Sleep for the day: a manual entry wins, otherwise the wearable's number. */
export const sleepFor = (d: DayLog) => d.sleep ?? d.health?.sleepHours ?? null;

/** Wearable workouts long enough to count as training. */
export const trainingSessions = (h?: HealthDay) => (h?.workouts ?? []).filter((w) => w.minutes >= 10);

const mk = (rows: Contributor[]): Score => {
  const live = rows.filter((r) => r.v != null);
  const w = live.reduce((a, r) => a + r.w, 0);
  return { rows, score: w ? Math.round((100 * live.reduce((a, r) => a + (r.v as number) * r.w, 0)) / w) : null };
};

export function scores(data: Data, k: string, now: Date = new Date()): Record<RingId, Score> {
  const d = dayOf(data, k);
  const h = d.health;
  const isToday = k === dkey(now);
  const pri = data.tasks.filter((t) => t.pri);
  const priDone = pri.filter((t) => t.done).length;
  const priV = isToday ? (pri.length ? priDone / pri.length : null) : (d.priDone ?? null);
  const habitsDone = d.habits.filter((x) => data.habits.includes(x)).length;
  const sleep = sleepFor(d);

  const hrvBase = baseline(data, k, 'hrv');
  const rhrBase = baseline(data, k, 'restingHR');
  // HRV at baseline scores 0.625; 15% above baseline maxes out, 25% below bottoms out.
  const hrvV = h?.hrv != null && hrvBase ? clamp((h.hrv / hrvBase - 0.75) / 0.4) : null;
  // Each beat per minute below baseline adds 10%.
  const rhrV = h?.restingHR != null && rhrBase ? clamp(0.5 + (rhrBase - h.restingHR) / 10) : null;

  const sessions = trainingSessions(h);
  const trained = d.workout || sessions.length > 0;
  const trainingTxt = sessions.length
    ? `${sessions.reduce((a, s) => a + s.minutes, 0)} min · ${sessions[0].name}`
    : d.workout
      ? 'Complete'
      : 'Not yet';

  return {
    readiness: mk([
      { n: 'Sleep', w: 0.4, v: sleep ? clamp(sleep / data.goals.sleep) : null, txt: sleep ? `${fmtH(sleep)} of ${fmtH(data.goals.sleep)}` : 'Not logged' },
      {
        n: 'HRV',
        w: 0.3,
        v: hrvV,
        txt: h?.hrv != null ? `${Math.round(h.hrv)} ms${hrvBase ? ` · avg ${Math.round(hrvBase)}` : ''}` : 'No data',
      },
      {
        n: 'Resting HR',
        w: 0.15,
        v: rhrV,
        txt: h?.restingHR != null ? `${Math.round(h.restingHR)} bpm${rhrBase ? ` · avg ${Math.round(rhrBase)}` : ''}` : 'No data',
      },
      { n: 'Energy', w: 0.15, v: d.energy ? (d.energy - 1) / 4 : null, txt: d.energy ? `${d.energy} of 5` : 'Not logged' },
    ]),
    execution: mk([
      { n: 'Priorities', w: 0.5, v: priV, txt: isToday ? (pri.length ? `${priDone} of ${pri.length}` : 'None set') : '' },
      { n: 'Focus blocks', w: 0.3, v: clamp(d.focus / 3), txt: `${d.focus} of 3` },
      { n: 'Habits', w: 0.2, v: data.habits.length ? habitsDone / data.habits.length : null, txt: `${habitsDone} of ${data.habits.length}` },
    ]),
    activity: mk([
      { n: 'Training', w: 0.4, v: trained ? 1 : 0, txt: trainingTxt },
      {
        n: 'Steps',
        w: 0.2,
        v: h?.steps != null ? clamp(h.steps / data.goals.steps) : null,
        txt: h?.steps != null ? `${h.steps.toLocaleString()} of ${data.goals.steps.toLocaleString()}` : 'No data',
      },
      { n: 'Hydration', w: 0.25, v: clamp(d.water / data.goals.water), txt: `${d.water} of ${data.goals.water} glasses` },
      { n: 'Desk breaks', w: 0.15, v: clamp(d.breaks / 4), txt: `${d.breaks} of 4` },
    ]),
  };
}

/** Average of the three rings for a past day, or null when nothing was logged. */
export function dayScore(data: Data, k: string, now: Date = new Date()): number | null {
  if (!data.days[k]) return null;
  const r = scores(data, k, now);
  const vals = [r.readiness.score, r.execution.score, r.activity.score].filter((x): x is number => x != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

export const readinessColor = (s: number | null, colors: { green: string; yellow: string; red: string; faint: string }) =>
  s == null ? colors.faint : s >= 67 ? colors.green : s >= 34 ? colors.yellow : colors.red;

export const readinessNote = (s: number | null) =>
  s == null
    ? 'Connect Apple Health or log sleep and energy in Body to see how ready you are today.'
    : s >= 67
      ? "You're recovered. A good day for a hard session or a long edit."
      : s >= 34
        ? 'Steady. Train as planned and keep stream length reasonable.'
        : 'Running low. Prioritise sleep, water and lighter work today.';
