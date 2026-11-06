import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { colors, spacing } from '@/theme/tokens';

import type { Person } from '../api';
import { ContactsSection } from '../components/ContactsSection';
import { FollowingSection } from '../components/FollowingSection';
import { PersonSheet, type PersonNotice } from '../components/PersonSheet';
import { RequestsSection } from '../components/RequestsSection';
import { SearchResults } from '../components/SearchResults';
import { isSearchable } from '../domain/searchQuery';
import { useFollowing } from '../hooks';
import { useFollowActions } from '../useFollowActions';
import { useTopBar } from '@/features/posts/useTopBar';

const NOTICE_MS = 4000;

function useNotice() {
  const [notice, setNotice] = useState<PersonNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  return [notice, setNotice] as const;
}

export function FriendsScreen() {
  const topBar = useTopBar();
  const actions = useFollowActions();
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<Person | null>(null);
  const [notice, setNotice] = useNotice();
  const { t } = useTranslation('friends');
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TopBar {...topBar} />
      <SearchHeader text={text} onChangeText={setText} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {isSearchable(text) ? (
          <SearchResults text={text} onAction={actions.run} onLongPress={setSelected} />
        ) : (
          <>
            <RequestsSection />
            <FollowingSection onAction={actions.run} onLongPress={setSelected} />
            <ContactsSection onAction={actions.run} onLongPress={setSelected} />
          </>
        )}
      </ScrollView>
      {notice ? <Toast tone="success" message={t(`person.${notice}`)} /> : null}
      <PersonSheet person={selected} onClose={() => setSelected(null)} onDone={setNotice} />
    </SafeAreaView>
  );
}

type HeaderProps = { text: string; onChangeText: (text: string) => void };

function SearchHeader({ text, onChangeText }: HeaderProps) {
  const { t } = useTranslation('friends');
  const following = useFollowing();
  return (
    <View style={styles.header}>
      <SearchField
        label={t('searchLabel')}
        prefix="handle"
        placeholder={t('searchPlaceholder')}
        value={text}
        onChangeText={onChangeText}
      />
      <Text variant="body13" color="textSecondary">
        {t('hint')}
      </Text>
      <Text variant="label11" color="maybe">
        {t('followingCount', { count: following.data?.length ?? 0 })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
});
