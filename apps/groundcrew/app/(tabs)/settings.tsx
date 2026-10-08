import { useEffect, useState } from 'react';
import { Button, Switch, Typography } from 'heroui-native';
import { Bell, Languages, LogOut, MapPin, User } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/lib/auth-context';
import { setAppLanguage } from '@/lib/i18n';
import { type ReminderOffset } from '@/lib/job-reminders';
import {
  getGeotagPreference,
  setGeotagPreference,
  useWorkerData,
} from '@/lib/worker-data';
import { useJobReminders } from '@/components/JobReminderProvider';

const languages = [
  { code: 'ET', label: 'Eesti' },
  { code: 'EN', label: 'English' },
  { code: 'LV', label: 'Latviešu' },
] as const;

const reminderOptions: { minutes: ReminderOffset; translationKey: '15' | '30' | '60' }[] = [
  { minutes: 15, translationKey: '15' },
  { minutes: 30, translationKey: '30' },
  { minutes: 60, translationKey: '60' },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const reminders = useJobReminders();
  const worker = useWorkerData();
  const { signOut, user } = useAuth();
  const [geotagPhotos, setGeotagPhotos] = useState(false);
  const [geotagLoaded, setGeotagLoaded] = useState(false);
  const [updateError, setUpdateError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getGeotagPreference(user.id)
      .then((enabled) => {
        if (active) setGeotagPhotos(enabled);
      })
      .catch((error: unknown) => {
        console.error('Could not load the photo location preference', error);
        if (active) setUpdateError(true);
      })
      .finally(() => {
        if (active) setGeotagLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function updateGeotagPreference(enabled: boolean) {
    if (!user) return;
    setUpdateError(false);
    try {
      await setGeotagPreference(user.id, enabled);
      setGeotagPhotos(enabled);
    } catch (error) {
      console.error('Could not save the photo location preference', error);
      setUpdateError(true);
    }
  }

  async function updateLanguage(language: (typeof languages)[number]['code']) {
    setUpdateError(false);
    try {
      await setAppLanguage(language);
    } catch (error) {
      console.error('Could not save the app language', error);
      setUpdateError(true);
    }
  }

  async function signOutWorker() {
    try {
      await signOut();
    } catch (error) {
      console.error('Could not sign out of GoldmanStocks', error);
      setUpdateError(true);
    }
  }

  if (worker.isPending) return <LoadingState label={t('settings.loading')} />;
  if (worker.isError)
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;

  return (
    <View className="bg-background flex-1">
      <AppHeader />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-safe-offset-28 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Typography className="text-accent mb-1 text-xs font-bold">
            {t('settings.eyebrow')}
          </Typography>
          <Typography className="text-foreground text-3xl font-bold tracking-tight">
            {t('settings.heading')}
          </Typography>
        </View>

        <View className="border-border bg-surface rounded-2xl border p-4">
          <View className="flex-row items-center gap-3">
            <View className="bg-accent-soft h-11 w-11 items-center justify-center rounded-full">
              <User size={20} className="text-accent" />
            </View>
            <View className="min-w-0 flex-1">
              <Typography className="text-foreground font-semibold">
                {worker.data.profile.full_name}
              </Typography>
              <Typography className="text-muted text-xs">
                {t('settings.assignedSites', { count: worker.data.sites.length })}
              </Typography>
            </View>
          </View>
        </View>

        <View className="border-border bg-surface gap-3 rounded-2xl border p-4">
          <View className="flex-row items-center gap-2">
            <Languages size={18} className="text-accent" />
            <Typography className="text-foreground font-semibold">
              {t('settings.language')}
            </Typography>
          </View>
          <View className="flex-row gap-2">
            {languages.map((language) => (
              <Button
                key={language.code}
                className="flex-1 px-2"
                size="sm"
                variant={
                  i18n.resolvedLanguage?.toUpperCase() === language.code ? 'primary' : 'secondary'
                }
                onPress={() => void updateLanguage(language.code)}
              >
                <Button.Label>{language.label}</Button.Label>
              </Button>
            ))}
          </View>
        </View>

        <View className="border-border bg-surface overflow-hidden rounded-2xl border">
          <View className="flex-row items-center gap-3 p-4">
            <MapPin size={19} className="text-accent" />
            <View className="min-w-0 flex-1">
              <Typography className="text-foreground text-sm font-semibold">
                {t('settings.geotag')}
              </Typography>
              <Typography className="text-muted text-xs">{t('settings.geotagDetail')}</Typography>
            </View>
            <Switch
              isSelected={geotagPhotos}
              isDisabled={!geotagLoaded}
              onSelectedChange={(value) => void updateGeotagPreference(value)}
            />
          </View>
          <View
            className={`border-border flex-row items-center gap-3 border-t p-4 ${reminders.isSupported ? '' : 'opacity-55'}`}
          >
            <Bell size={19} className="text-accent" />
            <View className="min-w-0 flex-1">
              <Typography className="text-foreground text-sm font-semibold">
                {t('settings.reminders')}
              </Typography>
              <Typography className="text-muted text-xs">
                {t(
                  reminders.isSupported
                    ? 'settings.remindersDetail'
                    : 'settings.remindersMobileOnly',
                )}
              </Typography>
            </View>
            <Switch
              isSelected={reminders.preferences.enabled}
              isDisabled={!reminders.isLoaded || !reminders.isSupported}
              onSelectedChange={(value) => void reminders.setEnabled(value)}
            />
          </View>
          {reminders.isSupported && reminders.preferences.enabled ? (
            <View className="border-border gap-3 border-t p-4">
              <Typography className="text-foreground text-sm font-semibold">
                {t('settings.reminderTiming')}
              </Typography>
              <View className="flex-row gap-2">
                {reminderOptions.map((option) => (
                  <Button
                    key={option.minutes}
                    className="flex-1 px-2"
                    size="sm"
                    variant={
                      reminders.preferences.minutesBefore === option.minutes
                        ? 'primary'
                        : 'secondary'
                    }
                    onPress={() => void reminders.setMinutesBefore(option.minutes)}
                  >
                    <Button.Label>
                      {t(`settings.reminderOptions.${option.translationKey}`)}
                    </Button.Label>
                  </Button>
                ))}
              </View>
            </View>
          ) : null}
          {reminders.error ? (
            <Typography className="text-danger border-border border-t p-4 text-sm">
              {t(`settings.${reminders.error}`)}
            </Typography>
          ) : null}
        </View>

        {updateError ? (
          <Typography className="text-danger text-sm">{t('settings.updateError')}</Typography>
        ) : null}

        <Button variant="secondary" onPress={() => void signOutWorker()}>
          <LogOut size={18} />
          <Button.Label>{t('settings.signOut')}</Button.Label>
        </Button>
      </ScrollView>
    </View>
  );
}
