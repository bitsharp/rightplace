import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { selectionFeedback } from '@/lib/haptics';
import { heights, spacing } from '@/theme/tokens';

import { STAR_COUNT } from './domain/form';

type Props = { value: number; onChange: (rating: number) => void };

const STARS = Array.from({ length: STAR_COUNT }, (_, index) => index + 1);

export function StarRating({ value, onChange }: Props) {
  const { t } = useTranslation('feedback');
  return (
    <View style={styles.row}>
      {STARS.map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={t('starA11y', { count: star })}
          accessibilityState={{ selected: star === value }}
          onPress={() => {
            selectionFeedback();
            onChange(star);
          }}
          style={styles.star}
        >
          <Icon
            name="star"
            size={32}
            color={star <= value ? 'going' : 'textSecondary'}
            filled={star <= value}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  star: {
    flex: 1,
    minHeight: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
