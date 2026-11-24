import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar, type AvatarPhoto } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProfileLink } from '@/components/ui/ProfileLink';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { formatHandle } from '@/features/profile/domain/handle';
import { useOpenProfile } from '@/features/profile/useOpenProfile';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import type { ActivityItem } from '../api';
import { activityRoute } from '../domain/activityTarget';
import { useActivity } from '../hooks';
import { useNotificationStore } from '../store/notificationStore';

const newest = (items: readonly ActivityItem[]) =>
  items.reduce((latest, item) => (item.createdAt > latest ? item.createdAt : latest), '');

// Opening "Novità" marks everything seen. Never earlier than the newest row, so a server clock ahead of
// the phone's does not leave the bell dot on.
function useMarkActivitySeen(items: readonly ActivityItem[] | undefined) {
  const markSeen = useNotificationStore((state) => state.markActivitySeen);
  useEffect(() => {
    if (items === undefined) return;
    const now = new Date().toISOString();
    const latest = newest(items);
    markSeen(latest > now ? latest : now);
  }, [items, markSeen]);
}

type RowProps = {
  item: ActivityItem;
  photo?: AvatarPhoto;
  onPress: () => void;
  onOpenActor: () => void;
};

// A pending requester is not linked to me yet: their photo is never visible, so it is not even requested.
const hasVisiblePhoto = (item: ActivityItem) => item.kind !== 'follow_request';

function ActivityRow({ item, photo, onPress, onOpenActor }: RowProps) {
  const { t, i18n } = useTranslation('notifications');
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(item.createdAt));
  return (
    <View style={styles.row}>
      {/* The row leads to what happened; the actor's avatar leads to their profile. */}
      <ProfileLink handle={item.actorHandle} onPress={onOpenActor}>
        <Avatar
          intent="going"
          size={36}
          initial={item.actorHandle.replace(/^@/, '').charAt(0)}
          photo={photo}
        />
      </ProfileLink>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.target}>
        <View style={styles.body}>
          <Text variant="body15Strong">
            {t(`activity.items.${item.kind}`, { handle: formatHandle(item.actorHandle) })}
          </Text>
          <Text variant="body12" color="textSecondary">
            {when}
          </Text>
        </View>
        <Icon name="chevronRight" size={16} color="textSecondary" />
      </Pressable>
    </View>
  );
}

export function ActivityScreen() {
  const { t } = useTranslation('notifications');
  const router = useRouter();
  const openProfile = useOpenProfile();
  const activity = useActivity();
  useMarkActivitySeen(activity.data);
  // One request for the whole list: the server returns only the photos I may see.
  const avatars = useAvatarUrls(
    activity.data?.filter(hasVisiblePhoto).map((item) => item.actorId) ?? [],
  );
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('activity.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/map'))}
          style={styles.back}
        >
          <Icon name="chevronLeft" />
        </Pressable>
        <Text accessibilityRole="header" variant="display22">
          {t('activity.title')}
        </Text>
      </View>
      {activity.isError ? <EmptyState message={t('activity.loadError')} /> : null}
      {activity.data?.length === 0 ? <EmptyState message={t('activity.empty')} /> : null}
      {activity.data?.map((item) => (
        <ActivityRow
          key={`${item.kind}:${item.actorHandle}:${item.postId ?? ''}:${item.createdAt}`}
          item={item}
          photo={hasVisiblePhoto(item) ? avatarPhotoFor(avatars, item.actorId) : undefined}
          onPress={() => router.push(activityRoute(item) as Href)}
          onOpenActor={() => openProfile({ handle: item.actorHandle, isMine: false })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  target: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: heights.buttonMedium,
  },
  body: { flex: 1, gap: spacing.xs },
});
