import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useSession } from '@/features/auth/useSession';
import { VenueTopBar } from '@/features/venue/components/VenueTopBar';
import { spacing } from '@/theme/tokens';

import { NotCreatorNotice } from './NotCreatorNotice';

type Props = { title: string; onBack: () => void; children: ReactNode };

// Common frame of the creator screens: the way back is always there; only creators see the content.
// Built on Screen so the forms inside get keyboard handling and bottom inset for free.
export function CreatorShell({ title, onBack, children }: Props) {
  const { profile } = useSession();
  return (
    <Screen scroll>
      <View style={styles.content}>
        <VenueTopBar onBack={onBack} title={title} />
        {profile?.isCreator ? children : <NotCreatorNotice />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.xxl } });
