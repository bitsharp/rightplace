import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { confirmFeedback } from '@/lib/haptics';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, spacing } from '@/theme/tokens';

import { rowStyles } from './VenueRow';

// Follow with acceptance (CLAUDE.md principle 6): "requested" unlocks nothing until accepted.
export type FollowState = 'none' | 'requested' | 'following';

type Props = {
  handle: string;
  meta: string;
  followState: FollowState;
  onPressFollow: () => void;
  venueLine?: string;
};

const BUTTON = {
  none: { labelKey: 'follow.follow', a11yKey: 'follow.a11yFollow' },
  requested: { labelKey: 'follow.requested', a11yKey: 'follow.a11yCancel' },
  following: { labelKey: 'follow.following', a11yKey: 'follow.a11yUnfollow' },
} as const;

export function FriendRow({ handle, meta, followState, onPressFollow, venueLine }: Props) {
  const publicHandle = formatHandle(handle);
  return (
    <View style={rowStyles.row}>
      <Avatar
        intent={followState === 'following' ? 'going' : 'neutral'}
        initial={publicHandle.charAt(1)}
      />
      <View style={styles.texts}>
        <Text variant="body15Strong">{publicHandle}</Text>
        <Text variant="body12" color="textSecondary">
          {meta}
        </Text>
        {venueLine ? (
          <Text variant="label11" color="maybe">
            {venueLine}
          </Text>
        ) : null}
      </View>
      <FollowButton publicHandle={publicHandle} followState={followState} onPress={onPressFollow} />
    </View>
  );
}

type FollowButtonProps = { publicHandle: string; followState: FollowState; onPress: () => void };

function FollowButton({ publicHandle, followState, onPress }: FollowButtonProps) {
  const { t } = useTranslation('ui');
  const button = BUTTON[followState];
  const isCallToAction = followState === 'none';
  const press = () => {
    if (isCallToAction) confirmFeedback();
    onPress();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(button.a11yKey, { handle: publicHandle })}
      accessibilityState={{ selected: followState === 'following' }}
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
  );
}

const styles = StyleSheet.create({
  texts: { flex: 1, gap: 3 },
  button: {
    height: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: 18,
    justifyContent: 'center',
  },
  cta: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.border },
});
