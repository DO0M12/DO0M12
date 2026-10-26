import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_HABITS, DEFAULT_LAUNCH } from './data';
import { dkey } from './dates';
import { EMPTY_DAY } from './scores';
import type { Data, DayLog, HealthDay } from './types';

export const fresh = (): Data => ({
  v: 1,
  name: 'Buck Bros Gaming',
  tasks: [],
  content: [],
  ideas: [],
  streams: [],
  days: {},
  habits: DEFAULT_HABITS.slice(),
  launch: DEFAULT_LAUNCH.slice(),
  launchDone: [],
  goals: { water: 8, sleep: 8, uploads: 3, steps: 8000 },
  reminders: { hydration: true, breaks: true, streams: true, morning: true },
  healthEnabled: false,
});

export const uid = () => Math.random().toString(36).slice(2, 10);

interface Store {
  data: Data;
  hydrated: boolean;
  /** Apply a change to a copy of the data and save it. */
  mutate: (fn: (d: Data) => void) => void;
  /** Same as mutate, scoped to today's log (created on first write). */
  mutateToday: (fn: (day: DayLog, d: Data) => void) => void;
  mergeHealth: (days: Record<string, HealthDay>) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      data: fresh(),
      hydrated: false,
      mutate: (fn) => {
        const next: Data = JSON.parse(JSON.stringify(get().data));
        fn(next);
        // Keep 120 days of logs.
        const keys = Object.keys(next.days).sort();
        while (keys.length > 120) delete next.days[keys.shift() as string];
        set({ data: next });
      },
      mutateToday: (fn) =>
        get().mutate((d) => {
          const k = dkey();
          d.days[k] ??= { ...EMPTY_DAY, habits: [] };
          fn(d.days[k], d);
        }),
      mergeHealth: (days) =>
        get().mutate((d) => {
          for (const [k, h] of Object.entries(days)) {
            d.days[k] = { ...(d.days[k] ?? { ...EMPTY_DAY, habits: [] }), health: h };
          }
          d.healthSyncedAt = new Date().toISOString();
        }),
    }),
    {
      name: 'cadence',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ data: s.data }),
      merge: (persisted, current) => {
        const saved = (persisted as { data?: Partial<Data> } | undefined)?.data ?? {};
        const base = fresh();
        return {
          ...current,
          data: {
            ...base,
            ...saved,
            goals: { ...base.goals, ...saved.goals },
            reminders: { ...base.reminders, ...saved.reminders },
          },
        };
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

/** Today's log without creating it. */
export const useToday = () => useStore((s) => s.data.days[dkey()] ?? EMPTY_DAY);
