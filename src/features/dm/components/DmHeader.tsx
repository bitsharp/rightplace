import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, type AvatarPhoto } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, heights, spacing } from '@/theme/tokens';

type Props = {
  handle: string | null;
  avatarPhoto?: AvatarPhoto;
  onBack: () => void;
  onOpenProfile: () => void;
};

// Principle 1: the photo is drawn only when the server signed it for me (accepted follow), else the initial.
export function DmHeader({ handle, avatarPhoto, onBack, onOpenProfile }: Props) {
  const { t } = useTranslation('dm');
  const shown = handle ? formatHandle(handle) : t('thread.unknownPerson');
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('thread.back')}
        onPress={onBack}
        style={styles.back}
      >
        <Icon name="chevronLeft" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('thread.openProfile')}
        disabled={handle === null}
        onPress={onOpenProfile}
        style={styles.person}
      >
        <Avatar
          intent={handle ? avatarIntent(handle) : 'neutral'}
          initial={shown.charAt(1)}
          size={40}
          photo={avatarPhoto}
        />
        <Text accessibilityRole="header" variant="display17" numberOfLines={1} style={styles.name}>
          {shown}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1 },
  back: {
    width: heights.buttonMedium,
    height: heights.buttonMedium,
    borderRadius: heights.buttonMedium / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
