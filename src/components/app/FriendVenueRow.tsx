import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FriendFaces, type FriendFace } from '@/components/app/FriendFaces';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import { rowStyles } from './VenueRow';

type Props = {
  venueName: string;
  friendHandles: string[];
  // Optional: without them the row is text only.
  faces?: readonly FriendFace[];
  urls?: Record<string, string>;
  onPress: () => void;
};

const NO_FACES: readonly FriendFace[] = [];
const NO_URLS: Record<string, string> = {};

// Only accepted follows end up here (CLAUDE.md principle 6): the list is filtered server-side.
export function FriendVenueRow({
  venueName,
  friendHandles,
  faces = NO_FACES,
  urls = NO_URLS,
  onPress,
}: Props) {
  const { t } = useTranslation('ui');
  const summary = `${t('friendsGoing', { count: friendHandles.length })} · ${friendHandles.map(formatHandle).join(', ')}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${venueName}, ${summary}`}
      onPress={onPress}
      style={rowStyles.row}
    >
      <FriendFaces friends={faces} urls={urls} />
      <View style={styles.texts}>
        <Text variant="body15Strong">{venueName}</Text>
        <Text variant="body12" color="textSecondary">
          {summary}
        </Text>
      </View>
      <Icon name="chevronRight" color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({ texts: { flex: 1, gap: spacing.xs / 2 } });
