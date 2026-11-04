import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  typicalDotDiameter,
  typicalLabelKey,
  type VisibleTypicalLevel,
} from '@/features/map/domain/typical';
import { colors, heights } from '@/theme/tokens';

type Props = {
  venueName: string;
  level: VisibleTypicalLevel;
  onPress: () => void;
};

// "Di solito" layer (CLAUDE.md principle 11): grey, qualitative, no label and no number, so it can
// never be read as tonight's turnout. Only the spoken description names the level.
export function TypicalDot({ venueName, level, onPress }: Props) {
  const { t } = useTranslation('ui');
  const diameter = typicalDotDiameter(level);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('typical.a11y', {
        venue: venueName,
        level: t(`typical.${typicalLabelKey(level)}`),
      })}
      onPress={onPress}
      style={styles.target}
    >
      <View
        testID="typical-dot"
        style={[styles.dot, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { backgroundColor: colors.typicalDot, opacity: 0.6 },
});
