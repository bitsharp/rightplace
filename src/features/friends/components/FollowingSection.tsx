import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { FollowAction } from '@/components/app/FriendRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';

import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';

import type { Person } from '../api';
import { useFollowing } from '../hooks';
import { listStyles } from './listStyles';
import { PersonRow } from './PersonRow';

type Props = {
  onAction: (userId: string, action: FollowAction) => void;
  onLongPress: (person: Person) => void;
};

export function FollowingSection({ onAction, onLongPress }: Props) {
  const { t } = useTranslation('friends');
  const router = useRouter();
  const following = useFollowing();
  // One request for the whole list: only the photos I am allowed to see come back (I follow all of them).
  const avatars = useAvatarUrls(following.data?.map((person) => person.userId) ?? []);
  if (!following.data) return null;
  return (
    <View style={listStyles.section}>
      <MonoLabel tone="maybe" size="medium">
        {t('following.title')}
      </MonoLabel>
      {following.data.length === 0 ? <EmptyState message={t('following.empty')} /> : null}
      <View style={listStyles.list}>
        {following.data.map((person) => (
          <PersonRow
            key={person.userId}
            person={person}
            followState="accepted"
            followsMe={person.followsMe}
            venueName={person.tonightVenueName}
            onAction={onAction}
            onLongPress={onLongPress}
            avatarPhoto={avatarPhotoFor(avatars, person.userId)}
            onPress={(selected) =>
              router.push({ pathname: '/u/[handle]', params: { handle: selected.handle } })
            }
          />
        ))}
      </View>
    </View>
  );
}
