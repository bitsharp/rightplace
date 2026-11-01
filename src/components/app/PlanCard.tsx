import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

export type PlanStatus = 'available' | 'selected' | 'active' | 'cancelled';

type Props = {
  name: string;
  priceLabel: string;
  status: PlanStatus;
  perks?: string[];
  onPress?: () => void;
};

const HIGHLIGHTED: PlanStatus[] = ['selected', 'active'];

export function PlanCard({ name, priceLabel, status, perks = [], onPress }: Props) {
  const highlighted = HIGHLIGHTED.includes(status);
  const selectable = status === 'available' || status === 'selected';
  const content = (
    <View
      testID="plan-card"
      style={[styles.card, { borderColor: highlighted ? colors.maybe : colors.border }]}
    >
      <View style={styles.header}>
        <Text variant="body16Strong">{name}</Text>
        {selectable ? (
          <Text variant="label12" color={highlighted ? 'maybe' : 'textSecondary'}>
            {priceLabel}
          </Text>
        ) : (
          <StatusBadge status={status} />
        )}
      </View>
      {perks.map((perk) => (
        <Text key={perk} variant="body14" color="textSecondary">
          {perk}
        </Text>
      ))}
    </View>
  );
  if (!selectable) return content;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${name}, ${priceLabel}`}
      accessibilityState={{ checked: status === 'selected' }}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const { t } = useTranslation('ui');
  const active = status === 'active';
  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeCancelled]}>
      <Text variant="body11Medium">{t(active ? 'plan.active' : 'plan.cancelled')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm + 2,
    padding: spacing.lg,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm + 2,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.segmented,
    borderWidth: 1,
  },
  badgeActive: { backgroundColor: colors.maybeTint, borderColor: colors.maybe },
  badgeCancelled: { backgroundColor: colors.border, borderColor: colors.border },
});
