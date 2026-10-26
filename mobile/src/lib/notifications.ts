import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminders, Stream } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const daily = (hour: number, minute: number): Notifications.DailyTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour,
  minute,
  channelId: CHANNEL,
});

/** Replaces every scheduled reminder with the set the settings ask for. */
export async function syncReminders(r: Reminders, streams: Stream[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!Object.values(r).some(Boolean)) return;
  if (!(await ensurePermission())) return;

  const jobs: Notifications.NotificationRequestInput[] = [];
  if (r.morning) jobs.push({ content: { title: 'Plan your day', body: 'Set three priorities and check your Readiness.' }, trigger: daily(8, 45) });
  if (r.hydration) {
    for (const h of [11, 14, 17]) jobs.push({ content: { title: 'Hydration check', body: 'Have a glass of water and log it.' }, trigger: daily(h, 0) });
  }
  if (r.breaks) {
    for (const [h, m] of [[13, 30], [16, 30], [21, 0]]) {
      jobs.push({ content: { title: 'Desk break', body: 'Stand up, stretch your wrists, look 20 ft away for 20 seconds.' }, trigger: daily(h, m) });
    }
  }
  if (r.streams) {
    for (const s of streams) {
      const [h, m] = s.time.split(':').map(Number);
      // Remind 30 minutes before going live.
      let mins = h * 60 + m - 30;
      let day = s.day;
      if (mins < 0) {
        mins += 24 * 60;
        day = (day + 6) % 7;
      }
      jobs.push({
        content: { title: `Live in 30 min: ${s.title}`, body: 'Water, snacks, stretch, then go.' },
        // Expo weekdays run 1 (Sunday) to 7 (Saturday).
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour: Math.floor(mins / 60), minute: mins % 60, channelId: CHANNEL },
      });
    }
  }
  await Promise.all(jobs.map((j) => Notifications.scheduleNotificationAsync(j)));
}

/** One-off alert for the end of a focus block; returns its id so a pause can cancel it. */
export async function scheduleFocusEnd(seconds: number, label: string): Promise<string | null> {
  if (!(await ensurePermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: `${label} complete`, body: 'Stand up and stretch before the next block.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds), channelId: CHANNEL },
  });
}

export const cancelNotification = (id: string) => Notifications.cancelScheduledNotificationAsync(id);
