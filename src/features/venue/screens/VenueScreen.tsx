import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { OpenChatButton } from '@/features/chat/components/OpenChatButton';
import { RangeStat } from '@/components/ui/RangeStat';
import { colors, spacing } from '@/theme/tokens';

import { DeclarationSheet } from '../components/DeclarationSheet';
import { DeclareCta } from '../components/DeclareCta';
import { FriendsGoing } from '../components/FriendsGoing';
import { GettingThere } from '../components/GettingThere';
import { VenueHeader } from '../components/VenueHeader';
import { VenueTopBar } from '../components/VenueTopBar';
import { WhoIsGoing } from '../components/WhoIsGoing';
import { useVenueScreen } from '../useVenueScreen';

export function VenueScreen({ venueId }: { venueId: string }) {
  const { t } = useTranslation('venue');
  const screen = useVenueScreen(venueId);
  const { venue } = screen;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <VenueTopBar onBack={screen.goBack} />
        {screen.loadFailed ? <EmptyState message={t('loadError')} /> : null}
        {venue ? <VenueBody screen={screen} /> : null}
      </ScrollView>
      {venue ? (
        <>
          <DeclareCta onPress={screen.openSheet} />
          <DeclarationSheet
            visible={screen.sheetOpen}
            onClose={screen.closeSheet}
            target={{ kind: 'night', id: venue.venueId }}
            venue={{
              id: venue.venueId,
              name: venue.name,
              timezone: venue.timezone,
              goingBand: screen.bands?.goingBand ?? 'pochi',
              maybeBand: screen.bands?.maybeBand ?? 'pochi',
            }}
            state={screen.declaration}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

type BodyProps = { screen: ReturnType<typeof useVenueScreen> };

function VenueBody({ screen }: BodyProps) {
  const { venue, bands } = screen;
  if (!venue) return null;
  return (
    <View style={styles.body}>
      <VenueHeader detail={venue} closingTime={screen.closingTime} />
      <View style={styles.bands}>
        <RangeStat intent="going" band={bands?.goingBand ?? 'pochi'} />
        <RangeStat intent="maybe" band={bands?.maybeBand ?? 'pochi'} />
      </View>
      <WhoIsGoing segment={screen.segment} onSegment={screen.setSegment} view={screen.statsView} />
      <FriendsGoing friends={screen.friends} />
      {screen.chatRoomId ? <OpenChatButton onPress={screen.openChat} /> : null}
      <GettingThere
        venueName={venue.name}
        cityName={venue.cityName}
        taxiNumber={venue.taxiNumber}
        direction={screen.direction}
        onDirection={screen.setDirection}
        links={screen.links}
        onOpen={screen.openLink}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  body: { gap: spacing.xxl },
  bands: { flexDirection: 'row', gap: spacing.md },
});
