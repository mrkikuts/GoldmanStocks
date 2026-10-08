import { router, Stack } from 'expo-router';
import { Button, Typography } from 'heroui-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View className="bg-background pt-safe-or-6 pb-safe-or-6 flex-1 items-center justify-center gap-5 px-5">
        <Typography className="text-foreground text-center text-xl font-semibold">
          {t('notFound.message')}
        </Typography>
        <Button onPress={() => router.replace('/')}>
          <Button.Label>{t('notFound.home')}</Button.Label>
        </Button>
      </View>
    </>
  );
}
