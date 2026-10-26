// Health Connect. Garmin Connect, Whoop, Fitbit and Samsung Health all write into it,
// so this is how wearable data reaches Cadence on Android.
import {
  aggregateRecord,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';

import { daysAgo, dkey, startOfDay } from './dates';
import { buildDays, minutesBetween, type SleepPiece } from './health-shared';
import type { HealthDay } from './types';

export const HEALTH_SOURCE: string | null = 'Health Connect';

const PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

// SleepStageType: 2 sleeping, 4 light, 5 deep, 6 REM. Awake and out-of-bed are skipped.
const SLEEP_STAGE: Record<number, SleepPiece['stage']> = { 2: 'asleep', 4: 'asleep', 5: 'deep', 6: 'rem' };

// ExerciseType values for the sessions this app cares about most.
const WORKOUT_NAMES: Record<number, string> = {
  5: 'Basketball', 8: 'Cycling', 25: 'Elliptical', 36: 'HIIT', 37: 'Hike', 54: 'Rowing', 56: 'Run', 64: 'Soccer',
  70: 'Strength', 74: 'Swim', 79: 'Walk', 81: 'Weightlifting', 83: 'Yoga',
};

let ready = false;
async function ensureClient(): Promise<boolean> {
  if (ready) return true;
  if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  ready = await initialize();
  return ready;
}

export async function isHealthAvailable(): Promise<boolean> {
  try {
    return await ensureClient();
  } catch {
    return false;
  }
}

export async function requestHealthAccess(): Promise<boolean> {
  if (!(await ensureClient())) return false;
  const granted = await requestPermission(PERMISSIONS);
  return granted.length > 0;
}

export async function readHealthDays(days: number): Promise<Record<string, HealthDay>> {
  if (!(await ensureClient())) return {};
  const end = new Date();
  const start = startOfDay(daysAgo(days - 1));
  const between = (a: Date, b: Date) => ({ operator: 'between' as const, startTime: a.toISOString(), endTime: b.toISOString() });
  const range = between(start, end);

  // A permission the user declined makes that read throw; treat it as no data.
  const safe = async <T>(p: Promise<T>, empty: T) => p.catch(() => empty);
  const [sleepRaw, hrvRaw, rhrRaw, exerciseRaw] = await Promise.all([
    safe(readRecords('SleepSession', { timeRangeFilter: between(new Date(start.getTime() - 12 * 3600_000), end) }), { records: [] }),
    safe(readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: range }), { records: [] }),
    safe(readRecords('RestingHeartRate', { timeRangeFilter: range }), { records: [] }),
    safe(readRecords('ExerciseSession', { timeRangeFilter: range }), { records: [] }),
  ]);

  const steps: Record<string, number> = {};
  await Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const dayStart = startOfDay(daysAgo(i));
      const res = await safe(aggregateRecord({ recordType: 'Steps', timeRangeFilter: between(dayStart, new Date(dayStart.getTime() + 86_400_000)) }), null);
      if (res && res.COUNT_TOTAL) steps[dkey(dayStart)] = res.COUNT_TOTAL;
    }),
  );

  const sleep: SleepPiece[] = [];
  for (const s of sleepRaw.records) {
    const source = s.metadata?.dataOrigin ?? 'unknown';
    if (s.stages?.length) {
      for (const st of s.stages) {
        const stage = SLEEP_STAGE[st.stage];
        if (stage) sleep.push({ start: new Date(st.startTime), end: new Date(st.endTime), source, stage });
      }
    } else {
      sleep.push({ start: new Date(s.startTime), end: new Date(s.endTime), source, stage: 'asleep' });
    }
  }

  return buildDays(days, {
    sleep,
    hrv: hrvRaw.records.map((r) => ({ at: new Date(r.time), value: r.heartRateVariabilityMillis })),
    restingHR: rhrRaw.records.map((r) => ({ at: new Date(r.time), value: r.beatsPerMinute })),
    steps,
    workouts: exerciseRaw.records.map((r, i) => ({
      id: r.metadata?.id ?? `${r.startTime}-${i}`,
      name: r.title || WORKOUT_NAMES[r.exerciseType] || 'Workout',
      start: new Date(r.startTime).toISOString(),
      minutes: minutesBetween(new Date(r.startTime), new Date(r.endTime)),
    })),
  });
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}
