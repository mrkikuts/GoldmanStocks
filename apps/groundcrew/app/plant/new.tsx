import { Typography } from 'heroui-native';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function NewPlantScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-3 p-6">
      <Typography className="text-foreground text-2xl font-bold">
        {t('register.heading')}
      </Typography>
      <View className="border-border bg-surface rounded-2xl border p-4">
        <Typography className="text-muted text-sm">{t('register.unavailable')}</Typography>
      </View>
    </ScrollView>
  );
}
