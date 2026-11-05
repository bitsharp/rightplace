import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

type Props = {
  handle: string;
  requested: boolean;
  onFollow: (handle: string) => void;
};

// Tagging someone I do not follow is not possible: offer the follow request right where it is needed.
export function FollowChip({ handle, requested, onFollow }: Props) {
  const { t } = useTranslation('chat');
  return (
    <View style={styles.row}>
      <Text variant="body13Medium" color="maybe">
        {`@${handle}`}
      </Text>
      <Chip
        label={requested ? t('composer.requested') : t('composer.follow')}
        selected={requested}
        tone="maybe"
        onPress={() => (requested ? undefined : onFollow(handle))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
