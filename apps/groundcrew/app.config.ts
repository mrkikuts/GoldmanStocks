import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  return {
    ...config,
    name: 'Goldman Stocks Worker',
    slug: 'goldman-stocks-worker',
    version: process.env.GOLDMAN_STOCKS_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'goldmanstocks',
    locales: {
      en: './locales/en.json',
      et: './locales/et.json',
      lv: './locales/lv.json',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: true,
      bundleIdentifier: process.env.GOLDMAN_STOCKS_IOS_BUNDLE_ID ?? 'com.goldmanstocks.worker',
    },
    android: {
      package: process.env.GOLDMAN_STOCKS_ANDROID_PACKAGE ?? 'com.goldmanstocks.worker',
      permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
    },
    web: {
      bundler: 'metro',
      // 'single' = SPA export: one index.html + client routing, so edge serving
      // needs only a single 404→index.html fallback rule.
      output: 'single',
      favicon: './public/icons/icon-192.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-splash-screen',
      [
        'expo-localization',
        { supportedLocales: { ios: ['en', 'et', 'lv'], android: ['en', 'et', 'lv'] } },
      ],
      [
        'expo-image-picker',
        { cameraPermission: 'Allow Goldman Stocks to photograph completed work.' },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Goldman Stocks to add your location to task proof photos when enabled.',
        },
      ],
      ...nativePlugins,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
