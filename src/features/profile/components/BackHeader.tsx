import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { heights, spacing } from '@/theme/tokens';

// The way back from the screens opened from a profile (edit, followers, following, a person's profile).
type Props = { title: string; fallback?: '/profile' | '/friends' | '/feed' };

export function BackHeader({ title, fallback = '/profile' }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('lists.back')}
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
        style={styles.button}
      >
        <Icon name="chevronLeft" />
      </Pressable>
      <Text accessibilityRole="header" variant="display17">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
