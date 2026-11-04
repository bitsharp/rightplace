import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import type { MyDeclaration } from '../api';

type Props = {
  declaration: MyDeclaration | null;
  onPress: (venueId: string) => void;
};

export function DeclarationPill({ declaration, onPress }: Props) {
  const { t } = useTranslation('map');
  if (!declaration) return null;
  const intent = t(
    declaration.intent === 'going' ? 'ui:intent.goingAction' : 'ui:intent.maybeAction',
  );
  const params = { venue: declaration.venueName, intent };
  const accent = declaration.intent === 'going' ? colors.goingBorder : colors.maybeBorder;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('pill.a11y', params)}
      onPress={() => onPress(declaration.venueId)}
      style={[styles.pill, { borderColor: accent }]}
    >
      <Text variant="body13Medium" numberOfLines={1} style={styles.text}>
        {t('pill.text', params)}
      </Text>
      <Icon name="chevronDown" size={14} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: heights.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  text: { flex: 1 },
});
