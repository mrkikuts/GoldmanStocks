import { MapPin, Navigation } from 'lucide-react-native';
import { Button, Typography, useThemeColor } from 'heroui-native';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/AppHeader';
import MapView from '@/components/MapView';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { translateData } from '@/lib/i18n';
import { useWorkerData } from '@/lib/worker-data';

export default function LocationsScreen() {
  const { t } = useTranslation();
  const worker = useWorkerData();
  const accentForeground = useThemeColor('accent-foreground');
  const muted = useThemeColor('muted');

  async function openInGoogleMaps(latitude: number, longitude: number) {
    const destination = encodeURIComponent(`${latitude},${longitude}`);
    try {
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
      );
    } catch {
      Alert.alert(t('locations.mapsErrorTitle'), t('locations.mapsErrorMessage'));
    }
  }

  if (worker.isPending) return <LoadingState label={t('locations.loading')} />;
  if (worker.isError)
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;
  const firstName = worker.data.profile.full_name.split(' ')[0] || t('locations.fallbackName');

  return (
    <View className="bg-background flex-1">
      <AppHeader />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-safe-offset-28 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Typography className="text-accent mb-1 text-xs font-bold">
            {t('locations.eyebrow')}
          </Typography>
          <Typography className="text-foreground text-3xl font-bold tracking-tight">
            {t('locations.heading')}
          </Typography>
          <Typography className="text-muted mt-1 text-sm">
            {t('locations.sitesFor', { count: worker.data.sites.length, name: firstName })}
          </Typography>
        </View>
        {worker.data.sites.map((site) => {
          const plants = worker.data.plants.filter((plant) => plant.project_id === site.id);
          return (
            <View
              key={site.id}
              className="border-border bg-surface overflow-hidden rounded-2xl border"
            >
              <View className="p-4">
                <View className="flex-row items-start gap-3">
                  <View className="min-w-0 flex-1">
                    <Typography className="text-foreground text-lg font-bold">
                      {site.name}
                    </Typography>
                    <Typography className="text-muted text-sm">
                      {site.status === 'healthy'
                        ? t('plants.status.healthy')
                        : site.status === 'attention'
                          ? t('plants.status.attention')
                          : t('plants.status.critical')}
                    </Typography>
                    <View className="mt-2 flex-row items-center gap-1">
                      <MapPin color={muted} size={14} />
                      <Typography className="text-muted shrink text-xs">
                        {site.address}, {site.city}
                      </Typography>
                    </View>
                  </View>
                  <View className="bg-accent-soft shrink-0 rounded-lg px-2.5 py-1.5">
                    <Typography className="text-accent text-xs font-semibold">
                      {t('locations.plants', { count: plants.length })}
                    </Typography>
                  </View>
                </View>
              </View>
              <MapView
                style={{ height: 220, width: '100%' }}
                initialRegion={{
                  latitude: site.lat,
                  longitude: site.lng,
                  latitudeDelta: 0.004,
                  longitudeDelta: 0.004,
                }}
                markers={plants.map((plant) => ({
                  id: plant.id,
                  coordinate: {
                    latitude: plant.lat ?? site.lat,
                    longitude: plant.lng ?? site.lng,
                  },
                  title: translateData(plant.common, t),
                  description: translateData(plant.site, t),
                  color:
                    plant.status === 'critical'
                      ? 'red'
                      : plant.status === 'attention'
                        ? 'orange'
                        : 'green',
                }))}
                zoomEnabled
                scrollEnabled
              />
              <View className="p-4">
                <Button
                  className="h-12"
                  onPress={() => void openInGoogleMaps(site.lat, site.lng)}
                >
                  <Navigation color={accentForeground} size={18} />
                  <Button.Label>{t('locations.openMaps')}</Button.Label>
                </Button>
              </View>
              <View className="border-border border-t p-4">
                <Typography className="text-muted text-xs">
                  {site.zones.map((zone) => translateData(zone, t)).join(' · ')}
                </Typography>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
