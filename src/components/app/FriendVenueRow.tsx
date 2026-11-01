import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import { rowStyles } from './VenueRow';

type Props = {
  venueName: string;
  friendHandles: string[];
  onPress: () => void;
};

// Only accepted follows end up here (CLAUDE.md principle 6): the list is filtered server-side.
export function FriendVenueRow({ venueName, friendHandles, onPress }: Props) {
  const { t } = useTranslation('ui');
  const summary = `${t('friendsGoing', { count: friendHandles.length })} · ${friendHandles.map(formatHandle).join(', ')}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${venueName}, ${summary}`}
      onPress={onPress}
      style={rowStyles.row}
    >
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
