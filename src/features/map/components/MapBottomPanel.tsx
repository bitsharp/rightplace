import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { MyDeclaration, RecommendedVenue } from '../api';
import type { LatLng } from '@/features/profile/domain/coarsen';

import type { FriendVenue, MapVenue } from '../domain/mapLayers';
import type { MapViewMode } from '../store/mapStore';

import { DeclarationPill } from './DeclarationPill';
import { FriendVenueList } from './FriendVenueList';
import { MapCards, type FeaturedCard } from './MapCards';

type Props = {
  view: MapViewMode;
  loaded: boolean;
  loadFailed: boolean;
  friendVenues: FriendVenue[];
  avatarUrls: Record<string, string>;
  featured: FeaturedCard | null;
  you: LatLng | null;
  sponsored: MapVenue | null;
  recommended: RecommendedVenue | null;
  declaration: MyDeclaration | null;
  onOpenVenue: (venueId: string) => void;
};

const MAX_HEIGHT = 230;

// Everything under the map: friends list (friends view) or cards (general view).
export function MapBottomPanel(props: Props) {
  const { t } = useTranslation('map');
  const { view, loaded, loadFailed, onOpenVenue } = props;
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
      {loadFailed ? (
        <Text variant="body13" color="textSecondary">
          {t('loadError')}
        </Text>
      ) : null}
      {view === 'friends' && loaded ? (
        <FriendVenueList venues={props.friendVenues} urls={props.avatarUrls} onOpen={onOpenVenue} />
      ) : null}
      {view === 'general' ? (
        <>
          <MapCards
            own={props.declaration}
            featured={props.featured}
            you={props.you}
            sponsored={props.sponsored}
            recommended={props.recommended}
            onOpen={onOpenVenue}
          />
        </>
      ) : null}
      <DeclarationPill declaration={props.declaration} onPress={onOpenVenue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { flexGrow: 0, maxHeight: MAX_HEIGHT },
  content: { gap: spacing.sm, padding: spacing.lg },
});
