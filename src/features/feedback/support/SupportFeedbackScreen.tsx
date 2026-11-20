import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoViewer } from '@/components/app/PhotoViewer';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackHeader } from '@/features/profile/components/BackHeader';
import { colors, spacing } from '@/theme/tokens';

import type { SupportInboxItem } from './domain/supportFeedback';
import { FeedbackCard } from './FeedbackCard';
import { useSupportFeedback } from './hooks';

// Inbox of the support team: the feedback sent from the app, newest first. The route is reachable only by
// accounts with is_support (RootNavigator), and the server answers NOT_SUPPORT to anyone else anyway.
export function SupportFeedbackScreen() {
  const { t } = useTranslation('feedback');
  const { bottom } = useSafeAreaInsets();
  const inbox = useSupportFeedback();
  const [viewing, setViewing] = useState<string | null>(null);
  const shots = useMemo(
    () => inbox.items.filter((item) => item.screenshotUrl !== null),
    [inbox.items],
  );
  const index = shots.findIndex((item) => item.id === viewing);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        testID="support-feedback-list"
        data={inbox.items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<BackHeader title={t('support.title')} />}
        ListEmptyComponent={
          <EmptyState
            message={
              inbox.isError ? t('support.loadError') : inbox.isLoading ? '' : t('support.empty')
            }
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: bottom + spacing.xxl }]}
        renderItem={({ item }: { item: SupportInboxItem }) => (
          <FeedbackCard item={item} onOpenScreenshot={(shot) => setViewing(shot.id)} />
        )}
        onEndReached={inbox.loadMore}
        onEndReachedThreshold={0.6}
        refreshing={inbox.isRefreshing}
        onRefresh={() => void inbox.refresh()}
      />
      <PhotoViewer
        photos={shots.map((item) => ({
          id: item.id,
          uri: item.screenshotUrl ?? undefined,
          cacheKey: item.id,
        }))}
        index={index >= 0 ? index : null}
        onClose={() => setViewing(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
});
