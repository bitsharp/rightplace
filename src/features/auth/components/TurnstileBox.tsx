import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { Language } from '@/i18n/domain/pickLanguage';
import { colors, radius, spacing } from '@/theme/tokens';

import {
  buildTurnstileHtml,
  isTurnstileNavigationAllowed,
  parseTurnstileMessage,
} from '../domain/turnstile';

type Props = {
  siteKey: string;
  language: Language;
  onToken: (token: string | null) => void;
};

type Status = 'pending' | 'verified' | 'error';

// The widget runs on Cloudflare's domain; this base URL must be an allowed hostname of the site key.
const BASE_URL = 'https://rightplace.app';

export function TurnstileBox({ siteKey, language, onToken }: Props) {
  const { t } = useTranslation('auth');
  const [status, setStatus] = useState<Status>('pending');
  const html = useMemo(() => buildTurnstileHtml({ siteKey, language }), [siteKey, language]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseTurnstileMessage(event.nativeEvent.data);
    if (!message) return;
    setStatus(
      message.type === 'token' ? 'verified' : message.type === 'error' ? 'error' : 'pending',
    );
    onToken(message.type === 'token' ? message.token : null);
  };

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text variant="body14">{t('captcha.label')}</Text>
        <MonoLabel tone={status === 'verified' ? 'maybe' : 'muted'} size="medium">
          {t(`captcha.${status}`)}
        </MonoLabel>
      </View>
      <WebView
        source={{ html, baseUrl: BASE_URL }}
        onMessage={handleMessage}
        originWhitelist={['https://*', 'about:*']}
        onShouldStartLoadWithRequest={(request) => isTurnstileNavigationAllowed(request.url)}
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  webview: { height: 70, backgroundColor: 'transparent' },
});
