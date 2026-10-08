import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Typography, useThemeColor } from 'heroui-native';
import { useMemo, useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/AppHeader';
import { JobCard } from '@/components/JobCard';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { addDays, formatWorkdayDate, isoDate, startOfWeek, weekdayShort } from '@/lib/dates';
import { getIntlLocale } from '@/lib/i18n';
import { jobsForDate, useWorkerData } from '@/lib/worker-data';

export default function MyDayScreen() {
  const { t } = useTranslation();
  const worker = useWorkerData();
  const currentWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const today = isoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, weekOffset * 7 + index)),
    [currentWeekStart, weekOffset],
  );

  function showWeek(offset: number) {
    const nextWeek = Math.max(0, Math.min(1, offset));
    setWeekOffset(nextWeek);
    setSelectedDate(nextWeek === 0 ? today : isoDate(addDays(currentWeekStart, 7)));
  }

  if (worker.isPending) return <LoadingState />;
  if (worker.isError)
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;

  const jobs = jobsForDate(worker.data.jobs, selectedDate);
  const completed = jobs.filter((job) => job.status === 'done').length;
  const firstName = worker.data.profile.full_name.split(' ')[0] || t('home.fallbackName');

  return (
    <View className="bg-background flex-1">
      <AppHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-safe-offset-28 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Typography className="text-accent mb-1 text-xs font-bold">
            {t('home.eyebrow')}
          </Typography>
          <Typography className="text-foreground text-3xl font-bold tracking-tight">
            {t('home.greeting', { name: firstName })}
          </Typography>
          <Typography className="text-muted mt-1 text-sm font-medium">
            {formatWorkdayDate(selectedDate)} ·{' '}
            {t('home.jobsDone', { completed, total: jobs.length })}
          </Typography>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => showWeek(weekOffset - 1)}
              isDisabled={weekOffset === 0}
              accessibilityLabel={t('home.previousWeek')}
            >
              <ChevronLeft size={17} />
            </Button>
            <Typography className="text-foreground text-sm font-semibold">
              {weekOffset === 0 ? t('home.thisWeek') : t('home.nextWeek')}
            </Typography>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => showWeek(weekOffset + 1)}
              isDisabled={weekOffset === 1}
              accessibilityLabel={t('home.nextWeek')}
            >
              <ChevronRight size={17} />
            </Button>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {week.map((date) => {
              const value = isoDate(date);
              const active = value === selectedDate;
              return (
                <Pressable
                  key={value}
                  onPress={() => setSelectedDate(value)}
                  accessibilityLabel={formatWorkdayDate(value)}
                  className={`min-w-14 items-center rounded-xl border px-3 py-2.5 ${active ? 'border-accent bg-accent' : 'border-border bg-surface'}`}
                >
                  <Typography
                    className={`text-xs font-semibold ${active ? 'text-accent-foreground' : 'text-foreground'}`}
                  >
                    {weekdayShort(date, getIntlLocale())}
                  </Typography>
                  <Typography
                    className={`mt-1 text-xs ${active ? 'text-accent-foreground/75' : 'text-muted'}`}
                  >
                    {date.getDate()}
                  </Typography>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button variant="secondary" onPress={() => router.push('/calendar')}>
            <CalendarDays size={18} />
            <Button.Label>{t('home.openCalendar')}</Button.Label>
          </Button>
        </View>

        <View className="gap-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              site={worker.data.sites.find((site) => site.id === job.project_id)}
            />
          ))}
          {jobs.length === 0 ? (
            <View className="border-border bg-surface items-center rounded-2xl border px-5 py-10">
              <Typography className="text-foreground text-base font-semibold">
                {t('home.noJobs')}
              </Typography>
              <Typography className="text-muted mt-1 text-sm">{t('home.clearDay')}</Typography>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
