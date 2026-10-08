import { Redirect } from 'expo-router';
import { Button, Input, Label, TextField, Typography, useThemeColor } from 'heroui-native';
import { Leaf, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/lib/auth-context';

export default function SignInScreen() {
  const { t } = useTranslation();
  const { isLoading, user, sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accentForeground = useThemeColor('accent-foreground');

  if (isLoading) return <LoadingState label={t('auth.opening')} />;
  if (user) return <Redirect href="/(tabs)" />;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (codeSent) await verifyCode(email.trim(), code.trim());
      else {
        await sendCode(email.trim());
        setCodeSent(true);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('auth.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="min-h-full justify-center px-6 py-safe-or-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-md">
          <View className="bg-accent mb-8 h-16 w-16 items-center justify-center rounded-2xl shadow-md">
            <Leaf color={accentForeground} size={32} strokeWidth={2.4} />
          </View>
          <Typography className="text-foreground text-3xl font-bold tracking-tight">
            {t('common.brand')}
          </Typography>
          <Typography className="text-muted mt-2 text-base">{t('auth.intro')}</Typography>
          <View className="mt-8 gap-5">
            <TextField isRequired>
              <Label>{t('auth.email')}</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder={t('auth.emailPlaceholder')}
                editable={!codeSent}
              />
            </TextField>
            {codeSent ? (
              <TextField isRequired>
                <Label>{t('auth.code')}</Label>
                <Input
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  placeholder="000000"
                />
              </TextField>
            ) : null}
            {error ? <Typography className="text-danger text-sm">{error}</Typography> : null}
            <Button
              size="lg"
              onPress={submit}
              isDisabled={submitting || !email.trim() || (codeSent && code.length !== 6)}
            >
              <Mail color={accentForeground} size={18} />
              <Button.Label>
                {submitting
                  ? t('auth.pleaseWait')
                  : codeSent
                    ? t('auth.verify')
                    : t('auth.sendCode')}
              </Button.Label>
            </Button>
            {codeSent ? (
              <Button
                variant="ghost"
                onPress={() => {
                  setCodeSent(false);
                  setCode('');
                  setError(null);
                }}
              >
                <Button.Label>{t('auth.differentEmail')}</Button.Label>
              </Button>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
