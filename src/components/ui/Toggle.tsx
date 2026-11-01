import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  icon?: IconName;
  optional?: boolean;
};

export function Toggle({
  title,
  value,
  onValueChange,
  description,
  icon,
  optional = false,
}: Props) {
  const { t } = useTranslation('ui');
  const toggle = () => {
    selectionFeedback();
    onValueChange(!value);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      onPress={toggle}
      style={styles.row}
    >
      {icon ? <Icon name={icon} size={26} color="maybe" /> : null}
      <View style={styles.texts}>
        <Text variant="body15Strong">
          {title}
          {optional ? <Text color="textSecondary">{` · ${t('optional')}`}</Text> : null}
        </Text>
        {description ? (
          <Text variant="body13" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <SwitchTrack on={value} />
    </Pressable>
  );
}

function SwitchTrack({ on }: { on: boolean }) {
  return (
    <View testID="toggle-track" style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1, gap: 3 },
  track: {
    width: 46,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.going, alignItems: 'flex-end' },
  trackOff: { backgroundColor: colors.border, alignItems: 'flex-start' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  knobOn: { backgroundColor: colors.text },
  knobOff: { backgroundColor: colors.textSecondary },
});
