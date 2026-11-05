import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { useFollowers, useRemoveFollower } from '@/features/friends/hooks';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { usePersonMeta } from '@/features/friends/usePersonMeta';
import { spacing } from '@/theme/tokens';

import { formatHandle } from '../domain/handle';

// "Remove" is silent: the removed follower is not told, and stops seeing anything of mine at once.
export function FollowersSection() {
  const { t } = useTranslation('profile');
  const meta = usePersonMeta();
  const followers = useFollowers();
  const remove = useRemoveFollower();
  if (!followers.data) return null;
  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('followers.title')}</MonoLabel>
      {followers.data.length === 0 ? <EmptyState message={t('followers.empty')} /> : null}
      {followers.data.map((person) => {
        const handle = formatHandle(person.handle);
        return (
          <View key={person.userId} style={rowStyles.row}>
            <Avatar intent={avatarIntent(person.handle)} initial={handle.charAt(1)} />
            <View style={styles.texts}>
              <Text variant="body15Strong">{handle}</Text>
              <Text variant="body12" color="textSecondary">
                {meta(person)}
              </Text>
            </View>
            <Button
              label={t('followers.remove')}
              accessibilityLabel={t('followers.a11yRemove', { handle })}
              variant="ghost"
              size="md"
              onPress={() => remove.mutate(person.userId)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  texts: { flex: 1, gap: 3 },
});
