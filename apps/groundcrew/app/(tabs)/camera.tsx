import { Typography } from 'heroui-native';
import { Camera, CheckCircle2 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { JobCard } from '@/components/JobCard';
import { useWorkerData } from '@/lib/worker-data';

export default function CameraScreen() {
  const { t } = useTranslation();
  const worker = useWorkerData();
  if (worker.isPending) return <LoadingState label={t('camera.loading')} />;
  if (worker.isError)
    return <ErrorState message={worker.error.message} onRetry={() => void worker.refetch()} />;
  const nextJob = worker.data.jobs.find((job) => job.status === 'planned');

  return (
    <View className="bg-background flex-1">
      <AppHeader />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-safe-offset-28 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Typography className="text-accent mb-1 text-xs font-bold">
            {t('camera.eyebrow')}
          </Typography>
          <Typography className="text-foreground text-3xl font-bold tracking-tight">
            {t('camera.heading')}
          </Typography>
        </View>
        {nextJob ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={18} className="text-accent" />
              <Typography className="text-foreground text-sm font-semibold">
                {t('camera.nextJob')}
              </Typography>
            </View>
            <JobCard
              job={nextJob}
              site={worker.data.sites.find((site) => site.id === nextJob.project_id)}
            />
          </View>
        ) : (
          <View className="bg-success-soft items-center rounded-2xl p-6">
            <CheckCircle2 color="#227447" size={30} />
            <Typography className="text-success mt-3 font-semibold">
              {t('camera.allDone')}
            </Typography>
          </View>
        )}
        <View className="items-center gap-2 pt-2">
          <Camera size={22} className="text-muted" />
          <Typography className="text-muted text-center text-xs">
            {t('camera.privatePhotos')}
          </Typography>
        </View>
      </ScrollView>
    </View>
  );
}
