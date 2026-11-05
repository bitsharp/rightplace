import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import {
  followButtonState,
  type FollowButtonState,
  type FollowStatus,
} from '@/features/friends/domain/followButton';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, spacing } from '@/theme/tokens';

import { rowStyles } from './VenueRow';

// Follow with acceptance (CLAUDE.md principle 6): "pending" unlocks nothing until accepted.
export type FollowAction = FollowButtonState['action'];

type Props = {
  handle: string;
  meta: string;
  followState: FollowStatus;
  followsMe?: boolean;
  onAction: (action: FollowAction) => void;
  onLongPress?: () => void;
  venueLine?: string;
};

export function FriendRow({
  handle,
  meta,
  followState,
  followsMe = false,
  onAction,
  onLongPress,
  venueLine,
}: Props) {
  const publicHandle = formatHandle(handle);
  const button = followButtonState(followState, followsMe);
  return (
    <Pressable
      testID="friend-row"
      accessible={false}
      onLongPress={onLongPress}
      style={rowStyles.row}
    >
      <Avatar intent={avatarIntent(handle)} initial={publicHandle.charAt(1)} />
      <View style={styles.texts}>
        <Text variant="body15Strong">{publicHandle}</Text>
        <Text variant="body12" color="textSecondary">
          {meta}
        </Text>
        {/* Defence in depth: the server already withholds the venue until the follow is accepted. */}
        {venueLine && followState === 'accepted' ? (
          <Text variant="label11" color="maybe">
            {venueLine}
          </Text>
        ) : null}
      </View>
      <FollowButton publicHandle={publicHandle} button={button} onAction={onAction} />
    </Pressable>
  );
}

type FollowButtonProps = {
  publicHandle: string;
  button: FollowButtonState;
  onAction: (action: FollowAction) => void;
};

function useConfirmUnfollow(publicHandle: string, confirm: () => void) {
  const { t } = useTranslation('ui');
  return () =>
    Alert.alert(t('follow.unfollowTitle', { handle: publicHandle }), t('follow.unfollowBody'), [
      { text: t('follow.cancel'), style: 'cancel' },
      { text: t('follow.unfollowConfirm'), style: 'destructive', onPress: confirm },
    ]);
}

function FollowButton({ publicHandle, button, onAction }: FollowButtonProps) {
  const { t } = useTranslation('ui');
  const isCallToAction = button.action === 'request';
  const confirmUnfollow = useConfirmUnfollow(publicHandle, () => onAction('unfollow'));
  const press = () => (button.action === 'unfollow' ? confirmUnfollow() : onAction(button.action));
  return (
    <View style={styles.actions}>
      {button.showFollowsYou ? (
        <Text variant="label10" color="textSecondary">
          {t('follow.followsYou')}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(button.a11yKey, { handle: publicHandle })}
        accessibilityState={{ selected: button.action === 'unfollow' }}
        hitSlop={4}
        onPress={press}
        style={[styles.button, isCallToAction ? styles.cta : styles.outline]}
      >
        <Text
          variant={isCallToAction ? 'body13Medium' : 'body13'}
          color={isCallToAction ? 'onAccent' : 'textSecondary'}
        >
          {t(button.labelKey)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  texts: { flex: 1, gap: 3 },
  actions: { alignItems: 'flex-end', gap: spacing.xs },
  button: {
    height: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: 18,
    justifyContent: 'center',
  },
  cta: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.border },
});
