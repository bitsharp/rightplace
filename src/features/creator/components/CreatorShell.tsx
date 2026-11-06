import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/useSession';
import { VenueTopBar } from '@/features/venue/components/VenueTopBar';
import { colors, spacing } from '@/theme/tokens';

import { NotCreatorNotice } from './NotCreatorNotice';

type Props = { title: string; onBack: () => void; children: ReactNode };

// Common frame of the creator screens: the way back is always there; only creators see the content.
export function CreatorShell({ title, onBack, children }: Props) {
  const { profile } = useSession();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView testID="screen-scroll" contentContainerStyle={styles.content}>
        <VenueTopBar onBack={onBack} title={title} />
        {profile?.isCreator ? children : <NotCreatorNotice />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xxl },
});
