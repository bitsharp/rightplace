import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { FollowRequest } from '../api';
import { avatarIntent } from '../domain/avatarColor';
import { usePersonMeta } from '../usePersonMeta';

type Props = {
  request: FollowRequest;
  onAccept: (userId: string) => void;
  onDecline: (userId: string) => void;
};

// A pending request exposes the requester's public identity only; nothing of mine until I accept.
export function RequestRow({ request, onAccept, onDecline }: Props) {
  const { t } = useTranslation('friends');
  const meta = usePersonMeta();
  const handle = formatHandle(request.handle);
  return (
    // Two buttons do not fit beside the name on a 320 pt phone: they get their own full-width row.
    <View testID="request-row" style={[rowStyles.row, styles.stacked]}>
      <View style={styles.identity}>
        <Avatar intent={avatarIntent(request.handle)} initial={handle.charAt(1)} />
        <View style={rowStyles.texts}>
          <Text variant="body15Strong" numberOfLines={1} ellipsizeMode="tail">
            {handle}
          </Text>
          <Text variant="body12" color="textSecondary" numberOfLines={1} ellipsizeMode="tail">
            {meta(request)}
          </Text>
        </View>
      </View>
      <View testID="request-actions" style={styles.actions}>
        <Button
          label={t('requests.decline')}
          accessibilityLabel={t('requests.a11yDecline', { handle })}
          variant="ghost"
          size="md"
          style={styles.button}
          onPress={() => onDecline(request.userId)}
        />
        <Button
          label={t('requests.accept')}
          accessibilityLabel={t('requests.a11yAccept', { handle })}
          size="md"
          style={styles.button}
          onPress={() => onAccept(request.userId)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
});
