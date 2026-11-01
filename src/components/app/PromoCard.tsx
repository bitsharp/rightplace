import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

type CardProps = {
  name: string;
  meta: string;
  onPress: () => void;
};

type Kind = 'sponsored' | 'recommended';

const KINDS = {
  sponsored: { labelKey: 'labels.sponsored', tone: 'going', borderColor: colors.goingBorder },
  recommended: { labelKey: 'labels.recommended', tone: 'maybe', borderColor: colors.border },
} as const;

// The only "ads" in the app are creator-sponsored nights, always labelled (CLAUDE.md principle 9).
function PromoCard({ kind, name, meta, onPress }: CardProps & { kind: Kind }) {
  const { t } = useTranslation('ui');
  const look = KINDS[kind];
  const label = t(look.labelKey);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${name}`}
      onPress={onPress}
      style={[styles.card, { borderColor: look.borderColor }]}
    >
      <View style={styles.texts}>
        <MonoLabel tone={look.tone}>{label}</MonoLabel>
        <Text variant="body15Strong">{name}</Text>
        <Text variant="body12" color="textSecondary">
          {meta}
        </Text>
      </View>
      <Icon name="chevronRight" color="textSecondary" />
    </Pressable>
  );
}

export const SponsoredCard = (props: CardProps) => <PromoCard kind="sponsored" {...props} />;
export const RecommendedCard = (props: CardProps) => <PromoCard kind="recommended" {...props} />;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1, gap: 3 },
});
