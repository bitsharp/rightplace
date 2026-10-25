import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme/tokens';

type Props = {
  title: string;
  children?: ReactNode;
};

// Temporary screen shell until each feature prompt replaces it.
export function PlaceholderScreen({ title, children }: Props) {
  const { t } = useTranslation('common');
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{t('placeholder.body')}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
});
