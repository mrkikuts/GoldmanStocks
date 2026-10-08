import { useLocalSearchParams } from 'expo-router';
import { Typography } from 'heroui-native';
import { CalendarDays, Leaf, MapPin } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ErrorState, LoadingState } from '@/components/ScreenState';
import { formatShortDate } from '@/lib/dates';
import { translateData } from '@/lib/i18n';
import { useWorkerData } from '@/lib/worker-data';

export default function PlantDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const worker = useWorkerData();
  if (worker.isPending) return <LoadingState label={t('plants.detailLoading')} />;
  if (worker.isError)
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;
  const plant = worker.data.plants.find((item) => item.id === id);
  if (!plant) return <ErrorState message={t('plants.notAssigned')} />;
  const site = worker.data.sites.find((item) => item.id === plant.project_id);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-5 px-5 pb-safe-offset-8 pt-6"
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-accent-soft h-40 items-center justify-center rounded-3xl">
        <View className="bg-accent h-20 w-20 items-center justify-center rounded-full">
          <Leaf size={38} className="text-accent-foreground" />
        </View>
      </View>
      <View>
        <View
          className={`mb-3 self-start rounded-full px-3 py-1 ${plant.status === 'critical' ? 'bg-danger-soft' : plant.status === 'attention' ? 'bg-warning-soft' : 'bg-success-soft'}`}
        >
          <Typography
            className={`text-xs font-bold ${plant.status === 'critical' ? 'text-danger' : plant.status === 'attention' ? 'text-warning' : 'text-success'}`}
          >
            {t(`plants.status.${plant.status}`)}
          </Typography>
        </View>
        <Typography className="text-foreground text-3xl font-bold">
          {translateData(plant.common, t)}
        </Typography>
        {plant.species ? (
          <Typography className="text-muted mt-1 text-sm italic">{plant.species}</Typography>
        ) : null}
      </View>
      <View className="border-border bg-surface gap-4 rounded-2xl border p-4">
        <View className="flex-row items-start gap-3">
          <MapPin size={19} className="text-accent mt-0.5" />
          <View>
            <Typography className="text-foreground text-sm font-semibold">{site?.name}</Typography>
            <Typography className="text-muted text-xs">
              {translateData(plant.site, t)}
              {site ? ` · ${site.name}` : ''}
            </Typography>
          </View>
        </View>
        <View className="flex-row items-start gap-3">
          <CalendarDays size={19} className="text-accent mt-0.5" />
          <View>
            <Typography className="text-foreground text-sm font-semibold">
              {plant.next_task ? translateData(plant.next_task, t) : t('plants.carePending')}
            </Typography>
            <Typography className="text-muted text-xs">
              {plant.next_care
                ? t('plants.nextCare', { date: formatShortDate(plant.next_care) })
                : t('plants.noDate')}
            </Typography>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
