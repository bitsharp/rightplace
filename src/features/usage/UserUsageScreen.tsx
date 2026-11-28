import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { BackHeader } from '@/features/profile/components/BackHeader';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, spacing } from '@/theme/tokens';

import { useUserUsage } from './hooks';
import { UsageEventRow } from './UsageEventRow';

// Logins and sessions of one user, newest first. Admin only (RootNavigator + NOT_ADMIN on the server).
export function UserUsageScreen() {
  const { t } = useTranslation('admin');
  const { bottom } = useSafeAreaInsets();
  const { userId, handle } = useLocalSearchParams<{ userId: string; handle?: string }>();
  const usage = useUserUsage(userId);
  const title = handle ? formatHandle(handle) : t('usage.detail.title');
  const message = usage.isError
    ? t('usage.loadError')
    : usage.isLoading
      ? ''
      : t('usage.detail.empty');
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        testID="usage-events-list"
        data={usage.events}
        keyExtractor={(event) => String(event.id)}
        ListHeaderComponent={<BackHeader title={title} fallback="/profile/edit" />}
        ListEmptyComponent={message === '' ? undefined : <EmptyState message={message} />}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + spacing.xxl }]}
        renderItem={({ item }) => <UsageEventRow event={item} />}
        onEndReached={usage.loadMore}
        onEndReachedThreshold={0.6}
        refreshing={usage.isRefreshing}
        onRefresh={() => void usage.refresh()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
});
