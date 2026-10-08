import { Leaf } from 'lucide-react-native';
import { Typography, useThemeColor } from 'heroui-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

export function AppHeader() {
  const { t } = useTranslation();
  const accentForeground = useThemeColor('accent-foreground');
  return (
    <View className="border-border bg-background pt-safe-or-3 flex-row items-center gap-3 border-b px-5 pb-3">
      <View className="bg-accent h-10 w-10 items-center justify-center rounded-xl shadow-sm">
        <Leaf color={accentForeground} size={21} strokeWidth={2.4} />
      </View>
      <View>
        <Typography className="text-foreground text-base font-bold">{t('common.brand')}</Typography>
        <Typography className="text-muted text-[11px] font-medium">
          {t('common.workerApp')}
        </Typography>
      </View>
    </View>
  );
}
