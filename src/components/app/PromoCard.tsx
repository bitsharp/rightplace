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

type BaseProps = CardProps & {
  label: string;
  tone: 'going' | 'maybe';
  borderColor: string;
  // Defaults to "<label>, <name>"; cards that say more (e.g. my intention) pass their own.
  accessibilityLabel?: string;
};

// Shared look of the cards under the map: a mono label, the venue, one line of context.
export function PromoCard({
  label,
  tone,
  borderColor,
  name,
  meta,
  onPress,
  accessibilityLabel,
}: BaseProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}, ${name}`}
      onPress={onPress}
      style={[styles.card, { borderColor }]}
    >
      <View style={styles.texts}>
        <MonoLabel tone={tone}>{label}</MonoLabel>
        <Text variant="body15Strong">{name}</Text>
        <Text variant="body12" color="textSecondary">
          {meta}
        </Text>
      </View>
      <Icon name="chevronRight" color="textSecondary" />
    </Pressable>
  );
}

// The only "ads" in the app are creator-sponsored nights, always labelled (CLAUDE.md principle 9).
export function SponsoredCard(props: CardProps) {
  const { t } = useTranslation('ui');
  return (
    <PromoCard
      label={t('labels.sponsored')}
      tone="going"
      borderColor={colors.goingBorder}
      {...props}
    />
  );
}

export function RecommendedCard(props: CardProps) {
  const { t } = useTranslation('ui');
  return (
    <PromoCard
      label={t('labels.recommended')}
      tone="maybe"
      borderColor={colors.border}
      {...props}
    />
  );
}

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
