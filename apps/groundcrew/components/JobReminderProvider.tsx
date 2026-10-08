import { AppState } from 'react-native';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/lib/auth-context';
import {
  cancelJobReminders,
  defaultReminderPreferences,
  jobRemindersSupported,
  loadReminderPreferences,
  reconcileJobReminders,
  requestReminderPermission,
  saveReminderPreferences,
  type ReminderOffset,
  type ReminderPreferences,
} from '@/lib/job-reminders';
import { useWorkerData } from '@/lib/worker-data';

type ReminderError = 'permissionDenied' | 'schedulingFailed' | null;

interface JobReminderContextValue {
  error: ReminderError;
  isLoaded: boolean;
  isSupported: boolean;
  preferences: ReminderPreferences;
  setEnabled: (enabled: boolean) => Promise<void>;
  setMinutesBefore: (minutesBefore: ReminderOffset) => Promise<void>;
}

const JobReminderContext = createContext<JobReminderContextValue | null>(null);

export function JobReminderProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? 'en';
  const { user } = useAuth();
  const worker = useWorkerData();
  const [preferences, setPreferences] = useState(defaultReminderPreferences);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<ReminderError>(null);
  const isLoaded = user ? loadedUserId === user.id : true;

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await cancelJobReminders();
        const stored = user ? await loadReminderPreferences(user.id) : defaultReminderPreferences;
        if (!active) return;

        setPreferences(stored);
        setLoadedUserId(user?.id ?? null);
        setError(null);
      } catch {
        if (!active) return;

        setPreferences(defaultReminderPreferences);
        setLoadedUserId(user?.id ?? null);
        setError('schedulingFailed');
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isLoaded || !worker.data) return;

    if (!preferences.enabled) {
      void cancelJobReminders();
      return;
    }

    void reconcileJobReminders({
      jobs: worker.data.jobs,
      language: currentLanguage,
      minutesBefore: preferences.minutesBefore,
      sites: worker.data.sites,
      t,
      userId: user.id,
    }).catch(() => setError('schedulingFailed'));
  }, [currentLanguage, isLoaded, preferences, t, user, worker.data]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) void worker.refetch();
    });
    return () => subscription.remove();
  }, [user, worker]);

  const persist = useCallback(
    async (next: ReminderPreferences) => {
      if (!user) return;
      await saveReminderPreferences(user.id, next);
      setPreferences(next);
    },
    [user],
  );

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      setError(null);
      try {
        if (enabled) {
          const granted = await requestReminderPermission();
          if (!granted) {
            setError('permissionDenied');
            return;
          }
        }
        await persist({ ...preferences, enabled });
      } catch {
        setError('schedulingFailed');
      }
    },
    [persist, preferences],
  );

  const setMinutesBefore = useCallback(
    async (minutesBefore: ReminderOffset) => {
      setError(null);
      try {
        await persist({ ...preferences, minutesBefore });
      } catch {
        setError('schedulingFailed');
      }
    },
    [persist, preferences],
  );

  const value = useMemo<JobReminderContextValue>(
    () => ({
      error,
      isLoaded,
      isSupported: jobRemindersSupported,
      preferences,
      setEnabled,
      setMinutesBefore,
    }),
    [error, isLoaded, preferences, setEnabled, setMinutesBefore],
  );

  return <JobReminderContext value={value}>{children}</JobReminderContext>;
}

export function useJobReminders(): JobReminderContextValue {
  const value = use(JobReminderContext);
  if (!value) throw new Error('useJobReminders must be used inside JobReminderProvider');
  return value;
}
