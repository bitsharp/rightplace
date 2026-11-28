import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BackHeader } from '@/features/profile/components/BackHeader';
import { colors, spacing } from '@/theme/tokens';

import { useUsageFilters } from './useUsageFilters';
import { UsageUserRow } from './UsageUserRow';
import { USAGE_PERIODS, type UsageUser } from './domain/types';
import { useUsageOverview } from './hooks';

// Admin only: the route is protected in RootNavigator and the server answers NOT_ADMIN to anyone else.
export function UsageOverviewScreen() {
  const { t } = useTranslation('admin');
  const { bottom } = useSafeAreaInsets();
  const { period, setPeriod, search, setSearch } = useUsageFilters();
  const overview = useUsageOverview(period, search);
  const now = new Date();
  const open = (user: UsageUser) =>
    router.push({
      pathname: '/admin/usage/[userId]',
      params: { userId: user.userId, handle: user.handle },
    });

  const message = overview.isError
    ? t('usage.loadError')
    : overview.isLoading
      ? ''
      : t('usage.empty');
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        testID="usage-overview-list"
        data={overview.users}
        keyExtractor={(user) => user.userId}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <BackHeader title={t('usage.title')} fallback="/profile/edit" />
            <SegmentedControl
              value={String(period)}
              onChange={(value) => setPeriod(Number(value))}
              options={USAGE_PERIODS.map((days) => ({
                value: String(days),
                label: t(`usage.period.d${days}`),
                tone: 'neutral' as const,
              }))}
            />
            <SearchField
              label={t('usage.searchLabel')}
              value={search}
              onChangeText={setSearch}
              prefix="handle"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        }
        ListEmptyComponent={message === '' ? undefined : <EmptyState message={message} />}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + spacing.xxl }]}
        renderItem={({ item }) => <UsageUserRow user={item} now={now} onOpen={open} />}
        refreshing={overview.isRefreshing}
        onRefresh={() => void overview.refresh()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.lg },
});
