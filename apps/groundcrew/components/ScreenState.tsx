import { Alert, Button, Spinner, Typography } from 'heroui-native';
import { RefreshCw } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-3 p-5">
      <Spinner size="lg" />
      <Typography className="text-muted text-sm">{label ?? t('common.loading')}</Typography>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 justify-center p-5">
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>{t('common.errorTitle')}</Alert.Title>
          <Alert.Description>{message}</Alert.Description>
        </Alert.Content>
      </Alert>
      {onRetry ? (
        <Button className="mt-4" onPress={onRetry} variant="secondary">
          <RefreshCw size={17} />
          <Button.Label>{t('common.tryAgain')}</Button.Label>
        </Button>
      ) : null}
    </View>
  );
}
