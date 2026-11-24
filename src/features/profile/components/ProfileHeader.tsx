import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/Icon';
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
  // "row": photo and counters side by side (public profile); "centered": big photo on top, counters under the
  // identity (my profile)
  layout?: 'row' | 'centered';
  // My own map city only: never shown for other people (principle 1)
  city?: string | null;
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
  layout = 'row',
  city,
  children,
}: Props) {
  const centered = layout === 'centered';
  const counterRow = (
    <Counters
      counters={counters}
      onOpenFollowers={onOpenFollowers}
      onOpenFollowing={onOpenFollowing}
      style={centered ? styles.countersCentered : styles.counters}
    />
  );
  return (
    <View style={styles.header}>
      <View testID="profile-header-top" style={centered ? styles.topCentered : styles.top}>
        {avatar}
        {centered ? null : counterRow}
      </View>
      <View style={centered ? styles.identityCentered : styles.identity}>
        <Text accessibilityRole="header" variant="display17">
          {formatHandle(handle)}
        </Text>
        {meta ? (
          <Text variant="body13" color="textSecondary">
            {meta}
          </Text>
        ) : null}
        {city ? <CityLine city={city} /> : null}
      </View>
      {centered ? counterRow : null}
      {children}
    </View>
  );
}

function CityLine({ city }: { city: string }) {
  return (
    <View style={styles.city}>
      <Icon name="map" size={14} color="maybe" />
      <Text variant="body13" color="textSecondary">
        {city}
      </Text>
    </View>
  );
}

type CountersProps = Pick<Props, 'counters' | 'onOpenFollowers' | 'onOpenFollowing'> & {
  style: ViewStyle;
};

function Counters({ counters, onOpenFollowers, onOpenFollowing, style }: CountersProps) {
  const { t } = useTranslation('profile');
  return (
    <View style={style}>
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
  topCentered: { flexDirection: 'column', alignItems: 'center' },
  counters: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  countersCentered: { flexDirection: 'row', justifyContent: 'space-around' },
  counter: { alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center', flex: 1 },
  identity: { gap: 2 },
  identityCentered: { gap: 2, alignItems: 'center' },
  city: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
