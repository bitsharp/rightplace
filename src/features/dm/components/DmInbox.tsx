import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { spacing } from '@/theme/tokens';

import type { DmThread } from '../api';
import { useDmThreads } from '../hooks';
import { DmRow } from './DmRow';

// The "Messaggi" half of the Chat tab: my conversations, newest first (the server already hides closed ones).
export function DmInbox() {
  const { t } = useTranslation('dm');
  const router = useRouter();
  const threads = useDmThreads();
  const avatars = useAvatarUrls(threads.data?.map((thread) => thread.otherUserId) ?? []);
  const open = (thread: DmThread) =>
    router.push({
      pathname: '/dm/[threadId]',
      params: {
        threadId: thread.threadId,
        handle: thread.otherHandle,
        userId: thread.otherUserId,
      },
    });
  return (
    <View style={styles.list}>
      {threads.isError ? <EmptyState message={t('inbox.loadError')} /> : null}
      {threads.data?.length === 0 ? <EmptyState message={t('inbox.empty')} /> : null}
      {threads.data?.map((thread) => (
        <DmRow
          key={thread.threadId}
          thread={thread}
          avatarPhoto={avatarPhotoFor(avatars, thread.otherUserId)}
          onPress={open}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.md } });
