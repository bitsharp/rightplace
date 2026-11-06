import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { RangeStat } from '@/components/ui/RangeStat';
import { OpenChatButton } from '@/features/chat/components/OpenChatButton';
import { DeclarationSheet } from '@/features/venue/components/DeclarationSheet';
import { DeclareCta } from '@/features/venue/components/DeclareCta';
import { FriendsGoing } from '@/features/venue/components/FriendsGoing';
import { GettingThere } from '@/features/venue/components/GettingThere';
import { VenueTopBar } from '@/features/venue/components/VenueTopBar';
import { colors, spacing } from '@/theme/tokens';

import { EventHeader } from '../components/EventHeader';
import { EventVenueCard } from '../components/EventVenueCard';
import { EventWhoIsGoing } from '../components/EventWhoIsGoing';
import { useEventScreen } from '../useEventScreen';

type Screen = ReturnType<typeof useEventScreen>;

// A creator's night, built from the venue page's parts (prompt 08) plus the night's own data.
export function EventScreen({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event');
  const screen = useEventScreen(eventId);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <VenueTopBar onBack={screen.goBack} title={t('venue:eventTitle')} />
        {screen.loadFailed ? <EmptyState message={t('loadError')} /> : null}
        {screen.event ? <Body screen={screen} /> : null}
      </ScrollView>
      <Declaration screen={screen} />
    </SafeAreaView>
  );
}

function Body({ screen }: { screen: Screen }) {
  const { event, venue } = screen;
  if (!event) return null;
  return (
    <View style={styles.body}>
      <EventHeader
        event={event}
        whenLabel={screen.whenLabel}
        targetLabel={screen.targetLabel}
        cancelled={screen.cancelled}
      />
      <View style={styles.bands}>
        <RangeStat intent="going" band={event.goingBand} />
        <RangeStat intent="maybe" band={event.maybeBand} />
      </View>
      <EventWhoIsGoing view={screen.statsView} />
      <FriendsGoing friends={event.friends} />
      {screen.chatRoomId ? <OpenChatButton onPress={screen.openChat} /> : null}
      <EventVenueCard name={event.venueName} kind={event.venueKind} onPress={screen.openVenue} />
      {venue ? (
        <GettingThere
          venueName={venue.name}
          cityName={venue.cityName}
          taxiNumber={venue.taxiNumber}
          direction={screen.direction}
          onDirection={screen.setDirection}
          links={screen.links}
          onOpen={screen.openLink}
        />
      ) : null}
    </View>
  );
}

function Declaration({ screen }: { screen: Screen }) {
  const { event } = screen;
  if (!event) return null;
  return (
    <>
      <DeclareCta onPress={screen.openSheet} disabled={!screen.canDeclare} />
      <DeclarationSheet
        visible={screen.sheetOpen && screen.canDeclare}
        onClose={screen.closeSheet}
        target={{ kind: 'event', id: event.eventId }}
        venue={{
          id: event.venueId,
          name: event.venueName,
          title: event.name,
          timezone: event.timezone,
          goingBand: event.goingBand,
          maybeBand: event.maybeBand,
        }}
        state={screen.declaration}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  body: { gap: spacing.xxl },
  bands: { flexDirection: 'row', gap: spacing.md },
});
