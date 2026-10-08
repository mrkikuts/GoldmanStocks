import { Button, Card, Typography, useThemeColor } from 'heroui-native';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/ScreenState';
import { isoDate, weekdayShort } from '@/lib/dates';
import { getIntlLocale, translateData } from '@/lib/i18n';
import { goBackOrReplace } from '@/lib/navigation';
import { calendarDates, isJobScheduledOn, useWorkerData } from '@/lib/worker-data';

export default function WorkCalendarScreen() {
  const worker = useWorkerData();
  const { t } = useTranslation();
  const [accent] = useThemeColor(['accent']);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));

  const days = useMemo(() => {
    return calendarDates(month).map((value) => new Date(`${value}T12:00:00`));
  }, [month]);

  const jobsByDate = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof worker.data>['jobs']>();
    for (const date of calendarDates(month)) {
      const jobs = (worker.data?.jobs ?? []).filter((job) => isJobScheduledOn(job, date));
      if (jobs.length > 0) grouped.set(date, jobs);
    }
    return grouped;
  }, [month, worker.data]);

  const sitesById = useMemo(
    () => new Map((worker.data?.sites ?? []).map((site) => [site.id, site])),
    [worker.data],
  );

  const selectedJobs = jobsByDate.get(selectedDate) ?? [];
  const locale = getIntlLocale();
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(month);
  const selectedLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${selectedDate}T12:00:00`));

  const moveMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelectedDate(isoDate(next));
  };

  if (worker.isPending) {
    return <LoadingState />;
  }

  if (worker.isError) {
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;
  }

  return (
    <View className="bg-background flex-1">
      <View className="border-border bg-background pt-safe-or-3 flex-row items-center gap-3 border-b px-4 pb-3">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          onPress={() => goBackOrReplace('/(tabs)')}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={20} />
        </Button>
        <Typography className="text-foreground text-lg font-semibold">
          {t('home.calendarTitle')}
        </Typography>
      </View>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-safe-offset-6 pt-6">
        <View className="flex-row items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => moveMonth(-1)}
            accessibilityLabel={t('home.previousMonth')}
          >
            <ChevronLeft size={18} />
          </Button>
          <Typography className="text-foreground text-base font-semibold capitalize">
            {monthLabel}
          </Typography>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => moveMonth(1)}
            accessibilityLabel={t('home.nextMonth')}
          >
            <ChevronRight size={18} />
          </Button>
        </View>

        <Card className="gap-2 p-3">
          <View className="flex-row">
            {days.slice(0, 7).map((date) => (
              <View key={isoDate(date)} className="flex-1 items-center py-1">
                <Typography className="text-muted text-xs font-semibold">
                  {weekdayShort(date, locale)}
                </Typography>
              </View>
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {days.map((date) => {
              const dateKey = isoDate(date);
              const jobs = jobsByDate.get(dateKey) ?? [];
              const inMonth = date.getMonth() === month.getMonth();
              const selected = dateKey === selectedDate;
              return (
                <Button
                  key={dateKey}
                  variant={selected ? 'primary' : 'ghost'}
                  size="sm"
                  className="w-[14.285%] min-w-0 px-0"
                  onPress={() => setSelectedDate(dateKey)}
                  accessibilityLabel={`${date.getDate()}, ${t('home.jobsScheduled', { count: jobs.length })}`}
                >
                  <View className="items-center gap-1">
                    <Button.Label className={inMonth ? undefined : 'opacity-35'}>
                      {date.getDate()}
                    </Button.Label>
                    <View
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: jobs.length > 0 ? accent : 'transparent' }}
                    />
                  </View>
                </Button>
              );
            })}
          </View>
        </Card>

        <View className="gap-3">
          <View className="flex-row items-end justify-between gap-3">
            <Typography className="text-foreground flex-1 text-lg font-semibold capitalize">
              {selectedLabel}
            </Typography>
            <Typography className="text-muted text-sm">
              {t('home.jobsScheduled', { count: selectedJobs.length })}
            </Typography>
          </View>

          {selectedJobs.length === 0 ? (
            <Card className="p-4">
              <Typography className="text-muted text-sm">{t('home.clearDay')}</Typography>
            </Card>
          ) : (
            selectedJobs.map((job) => (
              <Card key={job.id} className="gap-1 p-4">
                <Typography className="text-foreground font-semibold">
                  {translateData(job.title, t)}
                </Typography>
                <Typography className="text-muted text-sm">
                  {translateData(sitesById.get(job.project_id)?.name, t)}
                </Typography>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
