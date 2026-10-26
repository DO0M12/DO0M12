import { useEffect } from 'react';
import { AppState } from 'react-native';

import { readHealthDays } from './health';
import { syncReminders } from './notifications';
import { useStore } from './store';
import * as Notifications from 'expo-notifications';

const TEN_MIN = 10 * 60_000;

/** Pulls the last two weeks from Apple Health / Health Connect into the day logs. */
export async function syncHealth(force = false): Promise<void> {
  const { data, mergeHealth } = useStore.getState();
  if (!data.healthEnabled) return;
  if (!force && data.healthSyncedAt && Date.now() - Date.parse(data.healthSyncedAt) < TEN_MIN) return;
  try {
    const days = await readHealthDays(14);
    if (Object.keys(days).length) mergeHealth(days);
  } catch (e) {
    console.warn('Health sync failed', e);
  }
}

/** Syncs on launch and whenever the app comes back to the foreground. */
export function useHealthAutoSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    syncHealth();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && syncHealth());
    return () => sub.remove();
  }, [enabled]);
}

/**
 * Keeps scheduled reminders in step with settings and the stream schedule. It never
 * prompts for permission on its own; Settings asks when the user turns reminders on.
 */
export function useReminderAutoSync(enabled: boolean) {
  const reminders = useStore((s) => s.data.reminders);
  const streams = useStore((s) => s.data.streams);
  const key = JSON.stringify([reminders, streams]);
  useEffect(() => {
    if (!enabled) return;
    Notifications.getPermissionsAsync()
      .then((p) => (p.granted ? syncReminders(reminders, streams) : undefined))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);
}
