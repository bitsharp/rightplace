import { useTranslation } from 'react-i18next';

import { FriendRow, type FollowAction } from '@/components/app/FriendRow';
import type { AvatarPhoto } from '@/components/ui/Avatar';

import type { Person } from '../api';
import type { FollowStatus } from '../domain/followButton';
import { usePersonMeta } from '../usePersonMeta';

type Props = {
  person: Person;
  followState: FollowStatus;
  onAction: (userId: string, action: FollowAction) => void;
  onLongPress?: (person: Person) => void;
  onPress?: (person: Person) => void;
  avatarPhoto?: AvatarPhoto;
  followsMe?: boolean;
  venueName?: string | null;
  note?: string;
};

// Public identity only; the venue line is shown by FriendRow only for an accepted follow.
export function PersonRow({
  person,
  followState,
  onAction,
  onLongPress,
  onPress,
  avatarPhoto,
  followsMe,
  venueName,
  note,
}: Props) {
  const { t } = useTranslation('friends');
  const meta = usePersonMeta();
  return (
    <FriendRow
      handle={person.handle}
      meta={note ? `${meta(person)} · ${note}` : meta(person)}
      followState={followState}
      followsMe={followsMe}
      venueLine={venueName ? t('tonight', { venue: venueName }) : undefined}
      onAction={(action) => onAction(person.userId, action)}
      onLongPress={onLongPress ? () => onLongPress(person) : undefined}
      onPress={onPress ? () => onPress(person) : undefined}
      avatarPhoto={avatarPhoto}
    />
  );
}
