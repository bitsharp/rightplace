import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { formatHandle } from '../domain/handle';

export type ProfileCounters = {
  posts: number | null;
  followers: number | null;
  following: number | null;
};

type Props = {
  handle: string;
  // "25–34 · Donna": the only description of a person other users get (principle 1).
  meta: string | null;
  avatar: ReactNode;
  counters: ProfileCounters;
  // Only given when the lists are mine to open; a null counter is never tappable.
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
  children?: ReactNode;
};

// Instagram-style header, shared by my profile and the public one: avatar and counters side by side, then the
// identity and the actions.
export function ProfileHeader({
  handle,
  meta,
  avatar,
  counters,
  onOpenFollowers,
  onOpenFollowing,
  children,
}: Props) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.header}>
      <View style={styles.top}>
        {avatar}
        <View style={styles.counters}>
          <Counter value={counters.posts} label={t('header.posts')} />
          <Counter
            value={counters.followers}
            label={t('header.followers')}
            a11yLabel={(count) => t('header.a11yFollowers', { count })}
            onPress={onOpenFollowers}
          />
          <Counter
            value={counters.following}
            label={t('header.following')}
            a11yLabel={(count) => t('header.a11yFollowing', { count })}
            onPress={onOpenFollowing}
          />
        </View>
      </View>
      <View style={styles.identity}>
        <Text accessibilityRole="header" variant="display17">
          {formatHandle(handle)}
        </Text>
        {meta ? (
          <Text variant="body13" color="textSecondary">
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

type CounterProps = {
  value: number | null;
  label: string;
  a11yLabel?: (count: number) => string;
  onPress?: () => void;
};

function Counter({ value, label, a11yLabel, onPress }: CounterProps) {
  const content = (
    <>
      <Text variant="display17">{value === null ? '–' : String(value)}</Text>
      <Text variant="body12" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  if (!onPress || value === null) return <View style={styles.counter}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel?.(value)}
      onPress={onPress}
      style={styles.counter}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  counters: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  counter: { alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center', flex: 1 },
  identity: { gap: 2 },
});
