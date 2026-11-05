import { useTranslation } from 'react-i18next';

import { FriendRow, type FollowAction } from '@/components/app/FriendRow';

import type { Person } from '../api';
import type { FollowStatus } from '../domain/followButton';
import { usePersonMeta } from '../usePersonMeta';

type Props = {
  person: Person;
  followState: FollowStatus;
  onAction: (userId: string, action: FollowAction) => void;
  onLongPress?: (person: Person) => void;
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
    />
  );
}
