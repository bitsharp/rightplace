import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { formatHandle } from '@/features/profile/domain/handle';

const MIN_TARGET = 44;

type Props = {
  handle: string;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  hitSlop?: PressableProps['hitSlop'];
};

// Whatever shows an author (avatar, @handle) is a link to their profile: one label, one tap target >= 44.
export function ProfileLink({ handle, onPress, children, style, hitSlop }: Props) {
  const { t } = useTranslation('ui');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('profileLink.open', { handle: formatHandle(handle) })}
      onPress={onPress}
      hitSlop={hitSlop}
      style={[styles.target, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: MIN_TARGET, minWidth: MIN_TARGET, justifyContent: 'center' },
});
