import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { TFunction } from 'i18next';

import { addDays, startOfWeek } from '@/lib/dates';
import { translateData } from '@/lib/i18n';
import type { Job, Site } from '@/lib/worker-data';

export const reminderOffsets = [15, 30, 60] as const;
export type ReminderOffset = (typeof reminderOffsets)[number];

export interface ReminderPreferences {
  enabled: boolean;
  minutesBefore: ReminderOffset;
}

export const defaultReminderPreferences: ReminderPreferences = {
  enabled: false,
  minutesBefore: 30,
};

const REMINDER_KEY_PREFIX = 'goldman-stocks-job-reminders';
const REMINDER_SOURCE = 'goldman-stocks-job';
const CHANNEL_ID = 'job-reminders';
const MAX_SCHEDULED_JOBS = 50;

export const jobRemindersSupported = Platform.OS !== 'web';

if (jobRemindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function preferenceKey(userId: string): string {
  return `${REMINDER_KEY_PREFIX}:${userId}`;
}

function isReminderOffset(value: unknown): value is ReminderOffset {
  return reminderOffsets.some((offset) => offset === value);
}

export async function loadReminderPreferences(userId: string): Promise<ReminderPreferences> {
  const stored = await AsyncStorage.getItem(preferenceKey(userId));
  if (!stored) return defaultReminderPreferences;

  try {
    const value: unknown = JSON.parse(stored);
    if (
      typeof value === 'object' &&
      value !== null &&
      'enabled' in value &&
      typeof value.enabled === 'boolean' &&
      'minutesBefore' in value &&
      isReminderOffset(value.minutesBefore)
    ) {
      return { enabled: value.enabled, minutesBefore: value.minutesBefore };
    }
  } catch {
    // Ignore malformed local preferences and restore the safe defaults.
  }

  return defaultReminderPreferences;
}

export async function saveReminderPreferences(
  userId: string,
  preferences: ReminderPreferences,
): Promise<void> {
  await AsyncStorage.setItem(preferenceKey(userId), JSON.stringify(preferences));
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Job reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!jobRemindersSupported) return false;

  await configureAndroidChannel();
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) permissions = await Notifications.requestPermissionsAsync();
  return permissions.granted;
}

function isJobReminder(notification: Notifications.NotificationRequest): boolean {
  return notification.content.data?.source === REMINDER_SOURCE;
}

export async function cancelJobReminders(): Promise<void> {
  if (!jobRemindersSupported) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(isJobReminder)
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

function jobStartDate(job: Job, now: Date): Date | null {
  let date: Date;
  if (job.date) {
    const [year, month, day] = job.date.split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    date = new Date(year, month - 1, day, job.start, 0);
  } else {
    const monday = startOfWeek(now);
    const thisWeek = addDays(monday, job.day);
    date = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate(), job.start, 0);
    if (date.getTime() <= now.getTime()) date = addDays(date, 7);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function reconcileJobReminders({
  jobs,
  language,
  minutesBefore,
  sites,
  t,
  userId,
}: {
  jobs: Job[];
  language: string;
  minutesBefore: ReminderOffset;
  sites: Site[];
  t: TFunction;
  userId: string;
}): Promise<void> {
  if (!jobRemindersSupported) return;

  await configureAndroidChannel();
  await cancelJobReminders();

  const now = Date.now();
  const siteNames = new Map(sites.map((site) => [site.id, site.name]));
  const upcoming = jobs
    .filter((job) => job.status === 'planned')
    .map((job) => {
      const start = jobStartDate(job, new Date(now));
      return start ? { job, start, triggerAt: start.getTime() - minutesBefore * 60_000 } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.triggerAt > now)
    .sort((left, right) => left.triggerAt - right.triggerAt)
    .slice(0, MAX_SCHEDULED_JOBS);

  for (const { job, start, triggerAt } of upcoming) {
    const siteName = siteNames.get(job.project_id) ?? t('jobs.assignedSite');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.title'),
        body: t('notifications.body', {
          job: translateData(job.title, t),
          site: siteName,
          time: new Intl.DateTimeFormat(language, {
            hour: '2-digit',
            minute: '2-digit',
          }).format(start),
        }),
        sound: 'default',
        data: { source: REMINDER_SOURCE, userId, jobId: job.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerAt,
        channelId: CHANNEL_ID,
      },
    });
  }
}
