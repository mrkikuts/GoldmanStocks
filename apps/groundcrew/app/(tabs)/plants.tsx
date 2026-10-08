import { router } from 'expo-router';
import { Input, Typography } from 'heroui-native';
import { ChevronRight, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { formatShortDate } from '@/lib/dates';
import { translateData } from '@/lib/i18n';
import { useWorkerData } from '@/lib/worker-data';

const statusClass = {
  healthy: 'bg-success',
  attention: 'bg-warning',
  critical: 'bg-danger',
} as const;

export default function PlantsScreen() {
  const { t } = useTranslation();
  const worker = useWorkerData();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    if (!worker.data) return [];
    const value = query.trim().toLowerCase();
    return worker.data.plants.filter(
      (plant) =>
        !value ||
        [
          plant.common,
          plant.species,
          plant.site,
          translateData(plant.common, t),
          translateData(plant.site, t),
        ].some((field) => field.toLowerCase().includes(value)),
    );
  }, [query, t, worker.data]);

  if (worker.isPending) return <LoadingState label={t('plants.loading')} />;
  if (worker.isError)
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;

  return (
    <View className="bg-background flex-1">
      <AppHeader />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-safe-offset-28 pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-end gap-4">
          <View className="min-w-0 flex-1">
            <Typography className="text-accent mb-1 text-xs font-bold">
              {t('plants.eyebrow')}
            </Typography>
            <Typography className="text-foreground text-3xl font-bold tracking-tight">
              {t('plants.heading')}
            </Typography>
            <Typography className="text-muted mt-1 text-sm">
              {t('plants.resultCount', {
                results: results.length,
                total: worker.data.plants.length,
              })}
            </Typography>
          </View>
        </View>
        <View className="border-field-border bg-field flex-row items-center gap-2 rounded-xl border px-3">
          <Search size={17} className="text-muted" />
          <Input
            className="flex-1 border-0 bg-transparent px-0"
            value={query}
            onChangeText={setQuery}
            placeholder={t('plants.search')}
          />
        </View>
        {worker.data.sites.map((site) => {
          const plants = results.filter((plant) => plant.project_id === site.id);
          if (plants.length === 0) return null;
          return (
            <View key={site.id} className="gap-2">
              <Typography className="text-muted text-xs font-bold">
                {site.name} · {plants.length}
              </Typography>
              <View className="border-border bg-surface overflow-hidden rounded-2xl border">
                {plants.map((plant, index) => (
                  <Pressable
                    key={plant.id}
                    onPress={() =>
                      router.push({ pathname: '/plant/[id]', params: { id: plant.id } })
                    }
                    className={`flex-row items-center gap-3 p-4 ${index < plants.length - 1 ? 'border-border border-b' : ''}`}
                  >
                    <View className={`h-2.5 w-2.5 rounded-full ${statusClass[plant.status]}`} />
                    <View className="min-w-0 flex-1">
                      <Typography
                        className="text-foreground text-sm font-semibold"
                        numberOfLines={1}
                      >
                        {translateData(plant.common, t)}
                      </Typography>
                      <Typography className="text-muted mt-0.5 text-xs" numberOfLines={1}>
                        {translateData(plant.site, t)}
                        {plant.next_task ? ` · ${translateData(plant.next_task, t)}` : ''}
                        {plant.next_care ? ` ${formatShortDate(plant.next_care)}` : ''}
                      </Typography>
                    </View>
                    <ChevronRight size={17} className="text-muted" />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
