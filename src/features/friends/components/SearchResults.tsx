import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { FollowAction } from '@/components/app/FriendRow';
import { EmptyState } from '@/components/ui/EmptyState';

import type { Person } from '../api';
import { useUserSearch } from '../hooks';
import { listStyles } from './listStyles';
import { PersonRow } from './PersonRow';

type Props = {
  text: string;
  onAction: (userId: string, action: FollowAction) => void;
  onLongPress: (person: Person) => void;
};

export function SearchResults({ text, onAction, onLongPress }: Props) {
  const { t } = useTranslation('friends');
  const search = useUserSearch(text);
  if (search.isError) return <EmptyState message={t('loadError')} />;
  if (!search.data) return null;
  if (search.data.length === 0) return <EmptyState message={t('noResults')} />;
  return (
    <View style={listStyles.list}>
      {search.data.map((result) => (
        <PersonRow
          key={result.userId}
          person={result}
          followState={result.followState}
          followsMe={result.followsMe}
          venueName={result.tonightVenueName}
          onAction={onAction}
          onLongPress={onLongPress}
        />
      ))}
    </View>
  );
}
