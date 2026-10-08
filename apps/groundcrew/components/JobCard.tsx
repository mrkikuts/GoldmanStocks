import * as Haptics from 'expo-haptics';
import { Button, Typography, useThemeColor } from 'heroui-native';
import { Camera, Check, MapPin, RotateCcw, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Job, Site } from '@/lib/worker-data';
import { translateData } from '@/lib/i18n';
import { useCompleteJob, useToggleJobSkipped } from '@/lib/worker-data';

export function JobCard({ job, site }: { job: Job; site?: Site }) {
  const { t } = useTranslation();
  const accentForeground = useThemeColor('accent-foreground');
  const muted = useThemeColor('muted');
  const complete = useCompleteJob();
  const skip = useToggleJobSkipped();
  const [message, setMessage] = useState<string | null>(null);
  const done = job.status === 'done';
  const skipped = job.status === 'skipped';
  async function finish() {
    setMessage(null);
    try {
      const saved = await complete.mutateAsync(job);
      if (saved) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessage(t('jobs.photoError'));
    }
  }
  async function toggleSkipped() {
    setMessage(null);
    try {
      await skip.mutateAsync(job);
    } catch {
      setMessage(t('jobs.updateError'));
    }
  }

  return (
    <View className={`border-border bg-surface rounded-2xl border p-4 ${done ? 'opacity-70' : ''}`}>
      <View className="flex-row items-start gap-3">
        <View className="bg-background-secondary rounded-lg px-2 py-1.5">
          <Typography className="text-foreground text-sm font-semibold tabular-nums">
            {`${String(job.start).padStart(2, '0')}:00`}
          </Typography>
        </View>
        <View className="min-w-0 flex-1">
          <Typography className="text-foreground text-base font-semibold">
            {translateData(job.title, t)}
          </Typography>
          <View className="mt-1 flex-row items-center gap-1">
            <MapPin color={muted} size={13} />
            <Typography className="text-muted shrink text-xs" numberOfLines={1}>
              {site ? `${site.name} · ${site.city}` : t('jobs.assignedSite')}
            </Typography>
          </View>
        </View>
        <Typography className="text-muted text-xs font-medium">
          {t('jobs.hours', { count: job.duration })}
        </Typography>
      </View>
      {job.weather_note ? (
        <View className="bg-warning-soft mt-3 rounded-xl px-3 py-2">
          <Typography className="text-warning text-xs font-medium">
            {translateData(job.weather_note, t)}
          </Typography>
        </View>
      ) : null}
      {message ? <Typography className="text-danger mt-3 text-xs">{message}</Typography> : null}
      {done ? (
        <View className="bg-success-soft mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5">
          <Check color="#227447" size={18} strokeWidth={2.5} />
          <Typography className="text-success text-sm font-semibold">{t('jobs.done')}</Typography>
        </View>
      ) : skipped ? (
        <Button
          className="mt-4"
          variant="secondary"
          onPress={toggleSkipped}
          isDisabled={skip.isPending}
        >
          <RotateCcw size={17} />
          <Button.Label>{t('jobs.restore')}</Button.Label>
        </Button>
      ) : (
        <View className="mt-4 flex-row gap-2">
          <Button className="h-12 flex-1" onPress={finish} isDisabled={complete.isPending}>
            <Camera color={accentForeground} size={20} />
            <Button.Label>
              {complete.isPending ? t('common.saving') : t('jobs.finish')}
            </Button.Label>
          </Button>
          <Button
            className="h-12 w-12 px-0"
            variant="secondary"
            onPress={toggleSkipped}
            isDisabled={skip.isPending}
            accessibilityLabel={t('jobs.skip')}
          >
            <X size={19} />
          </Button>
        </View>
      )}
    </View>
  );
}
