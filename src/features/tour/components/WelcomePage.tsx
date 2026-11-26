import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { WelcomeArt, type WelcomeArtKind } from './WelcomeArt';

export const PRIVACY_POINTS = ['bands', 'photo', 'chat', 'posts', 'location'] as const;

type Props = { kind: WelcomeArtKind; width: number };

export function WelcomePage({ kind, width }: Props) {
  const { t } = useTranslation('tour');
  return (
    <View style={[styles.page, { width }]}>
      <WelcomeArt kind={kind} />
      <Text variant="display24" accessibilityRole="header" style={styles.title}>
        {t(`welcome.pages.${kind}.title`)}
      </Text>
      {kind === 'privacy' ? (
        <View style={styles.points}>
          {PRIVACY_POINTS.map((point) => (
            <View key={point} style={styles.point}>
              <View style={styles.bullet} />
              <Text variant="body15" color="textSecondary" style={styles.pointText}>
                {t(`welcome.pages.privacy.points.${point}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="body16" color="textSecondary">
          {t(`welcome.pages.${kind}.body`)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { justifyContent: 'center', gap: spacing.xl },
  title: { textAlign: 'left' },
  points: { gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: colors.maybe },
  pointText: { flex: 1 },
});
