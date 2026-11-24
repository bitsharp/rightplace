import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FriendVenueRow } from '@/components/app/FriendVenueRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing } from '@/theme/tokens';

import { friendFacesOf, type FriendVenue } from '../domain/mapLayers';

type Props = {
  venues: FriendVenue[];
  // Signed photos by user id (one batch for the whole map screen); missing = initial.
  urls: Record<string, string>;
  onOpen: (venueId: string) => void;
};

export function FriendVenueList({ venues, urls, onOpen }: Props) {
  const { t } = useTranslation('map');
  if (venues.length === 0) return <EmptyState message={t('friendsEmpty')} />;
  return (
    <View style={styles.list}>
      {venues.map((venue) => (
        <FriendVenueRow
          key={venue.venueId}
          venueName={venue.name}
          friendHandles={venue.handles}
          faces={friendFacesOf(venue.handles, venue.friendIds)}
          urls={urls}
          onPress={() => onOpen(venue.venueId)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.sm } });
