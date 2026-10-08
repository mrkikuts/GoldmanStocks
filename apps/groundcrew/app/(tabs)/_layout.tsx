import { Redirect, Tabs } from 'expo-router';
import { CalendarDays, Camera, Leaf, MapPin, Settings } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useThemeColor } from 'heroui-native';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/lib/auth-context';

export default function TabLayout() {
  const { t } = useTranslation();
  const { isLoading, user } = useAuth();
  const [background, foreground, border, accent, muted, accentForeground] = useThemeColor([
    'background',
    'foreground',
    'border',
    'accent',
    'muted',
    'accent-foreground',
  ]);

  if (isLoading) return <LoadingState />;
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <>
      {/* oxlint-disable-next-line react/style-prop-object -- Expo StatusBar's `style` API takes an appearance string. */}
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: background },
          tabBarStyle: {
            backgroundColor: background,
            borderTopColor: border,
            height: 72,
            paddingBottom: 8,
            paddingTop: 7,
            shadowColor: foreground,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 8,
          },
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: muted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="locations"
          options={{
            title: t('navigation.locations'),
            tabBarIcon: ({ color, size }) => <MapPin color={color} size={size ?? 22} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: t('navigation.myDay'),
            tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size ?? 22} />,
          }}
        />
        <Tabs.Screen
          name="camera"
          options={{
            title: '',
            tabBarAccessibilityLabel: t('navigation.camera'),
            tabBarIcon: () => <Camera color={accentForeground} size={27} />,
            tabBarButton: ({ ref: _ref, ...props }) => (
              <Pressable
                {...props}
                accessibilityLabel={t('navigation.camera')}
                accessibilityRole="button"
                className="flex-1 items-center"
              >
                <View className="border-background bg-accent -mt-7 h-16 w-16 items-center justify-center rounded-full border-4 shadow-lg">
                  <Camera color={accentForeground} size={27} />
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="plants"
          options={{
            title: t('navigation.plants'),
            tabBarIcon: ({ color, size }) => <Leaf color={color} size={size ?? 22} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('navigation.settings'),
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size ?? 22} />,
          }}
        />
      </Tabs>
    </>
  );
}
