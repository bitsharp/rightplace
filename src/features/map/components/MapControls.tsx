import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { TourAnchor } from '@/features/tour/components/TourAnchor';
import { colors, heights, radius, spacing } from '@/theme/tokens';

type Props = {
  // The map has no filters of its own: this opens the search, where the city and type filters live.
  onOpenFilters: () => void;
  onExpand: () => void;
  onLocate: () => void;
};

type ButtonProps = { icon: IconName; label: string; onPress: () => void; going?: boolean };

function RoundButton({ icon, label, onPress, going }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
    >
      <Icon name={icon} color={going ? 'going' : 'text'} />
    </Pressable>
  );
}

// One column in the top right corner of the compact map: same x, same size, even spacing.
export function MapControls({ onOpenFilters, onExpand, onLocate }: Props) {
  const { t } = useTranslation('map');
  return (
    <TourAnchor id="map.hotSpot" testID="map-controls" style={styles.column}>
      <RoundButton icon="filters" label={t('header.filters')} onPress={onOpenFilters} />
      <RoundButton icon="expand" label={t('fullscreen.open')} onPress={onExpand} />
      <RoundButton icon="locate" label={t('locate')} onPress={onLocate} going />
    </TourAnchor>
  );
}

export const CONTROLS_WIDTH = heights.minTapTarget;

const styles = StyleSheet.create({
  column: { position: 'absolute', top: spacing.lg, right: spacing.lg, gap: spacing.sm },
  button: {
    width: CONTROLS_WIDTH,
    height: CONTROLS_WIDTH,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
