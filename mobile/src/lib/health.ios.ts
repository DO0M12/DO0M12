// Apple Health. Whoop, Garmin Connect, Oura and Strava all write into it, so this is
// how wearable data reaches Cadence on iPhone.
import {
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import { daysAgo, dkey, startOfDay } from './dates';
import { buildDays, minutesBetween, toKcal, toKm, type SleepPiece } from './health-shared';
import type { HealthDay } from './types';

export const HEALTH_SOURCE: string | null = 'Apple Health';

const READ = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierStepCount',
  'HKWorkoutTypeIdentifier',
] as const;

// HKCategoryValueSleepAnalysis: 1 unspecified, 3 core, 4 deep, 5 REM. 0 (in bed) and 2 (awake) are skipped.
const SLEEP_STAGE: Record<number, SleepPiece['stage']> = { 1: 'asleep', 3: 'asleep', 4: 'deep', 5: 'rem' };

// HKWorkoutActivityType values for the sessions this app cares about most.
const WORKOUT_NAMES: Record<number, string> = {
  6: 'Basketball', 8: 'Boxing', 13: 'Cycling', 16: 'Elliptical', 20: 'Strength', 24: 'Hike', 35: 'Rowing',
  37: 'Run', 41: 'Soccer', 46: 'Swim', 48: 'Tennis', 50: 'Strength', 52: 'Walk', 57: 'Yoga', 63: 'HIIT',
  73: 'Mixed cardio', 77: 'Dance', 79: 'Pickleball',
};

export async function isHealthAvailable(): Promise<boolean> {
  try {
    return await isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

export async function requestHealthAccess(): Promise<boolean> {
  // HealthKit never reveals whether read access was granted, so success here only
  // means the prompt was shown. Empty reads are the signal that access is off.
  return requestAuthorization({ toRead: READ });
}

export async function readHealthDays(days: number): Promise<Record<string, HealthDay>> {
  const end = new Date();
  const start = startOfDay(daysAgo(days - 1));
  const sleepStart = new Date(start.getTime() - 12 * 3600_000);
  const range = { date: { startDate: start, endDate: end } };

  const [sleepRaw, hrvRaw, rhrRaw, workoutsRaw] = await Promise.all([
    queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit: 0, filter: { date: { startDate: sleepStart, endDate: end } } }),
    queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', { limit: 0, unit: 'ms', filter: range }),
    queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', { limit: 0, unit: 'count/min', filter: range }),
    queryWorkoutSamples({ limit: 0, ascending: false, filter: range }),
  ]);

  // Statistics queries de-duplicate overlapping step sources (phone + watch).
  const steps: Record<string, number> = {};
  await Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const dayStart = startOfDay(daysAgo(i));
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const stats = await queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
        filter: { date: { startDate: dayStart, endDate: dayEnd } },
        unit: 'count',
      });
      if (stats.sumQuantity) steps[dkey(dayStart)] = stats.sumQuantity.quantity;
    }),
  );

  const sleep: SleepPiece[] = [];
  for (const s of sleepRaw) {
    const stage = SLEEP_STAGE[Number(s.value)];
    if (stage) sleep.push({ start: new Date(s.startDate), end: new Date(s.endDate), source: s.sourceRevision.source.bundleIdentifier, stage });
  }

  return buildDays(days, {
    sleep,
    hrv: hrvRaw.map((s) => ({ at: new Date(s.startDate), value: s.quantity })),
    restingHR: rhrRaw.map((s) => ({ at: new Date(s.startDate), value: s.quantity })),
    steps,
    workouts: workoutsRaw.map((w) => ({
      id: w.uuid,
      name: WORKOUT_NAMES[Number(w.workoutActivityType)] ?? 'Workout',
      start: new Date(w.startDate).toISOString(),
      minutes: minutesBetween(new Date(w.startDate), new Date(w.endDate)),
      kcal: toKcal(w.totalEnergyBurned),
      km: toKm(w.totalDistance),
    })),
  });
}

export function openHealthSettings(): void {
  Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
}
