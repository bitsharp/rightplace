import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { FollowAction } from '@/components/app/FriendRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/useSession';

import type { Person } from '../api';
import { useContactSuggestions } from '../useContactSuggestions';
import { listStyles } from './listStyles';
import { PersonRow } from './PersonRow';

type Props = {
  onAction: (userId: string, action: FollowAction) => void;
  onLongPress: (person: Person) => void;
};

// Only for users who turned contacts on; the permission is asked when they tap the button.
export function ContactsSection(props: Props) {
  const { profile } = useSession();
  return profile?.contactsOptIn ? <ContactsBody {...props} /> : null;
}

// Contact rows are not in the search cache, so the "request sent" state is kept here until the next scan.
function useRequestedIds(onAction: Props['onAction']) {
  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());
  const act = (userId: string, action: FollowAction) => {
    setRequested((current) => {
      const next = new Set(current);
      if (action === 'request') next.add(userId);
      else next.delete(userId);
      return next;
    });
    onAction(userId, action);
  };
  return { requested, act };
}

function ContactsBody({ onAction, onLongPress }: Props) {
  const { t } = useTranslation('friends');
  const suggestions = useContactSuggestions();
  const { requested, act } = useRequestedIds(onAction);
  return (
    <View style={listStyles.section}>
      <MonoLabel tone="going" size="medium">
        {t('contacts.title')}
      </MonoLabel>
      <Text variant="body13" color="textSecondary">
        {t('contacts.body')}
      </Text>
      <Button
        label={t('contacts.cta')}
        variant="secondary"
        size="md"
        loading={suggestions.loading}
        onPress={suggestions.find}
      />
      <ContactsResult suggestions={suggestions}>
        {(matches) =>
          matches.map((person) => (
            <PersonRow
              key={person.userId}
              person={person}
              followState={requested.has(person.userId) ? 'pending' : 'none'}
              note={t('contacts.fromBook')}
              onAction={act}
              onLongPress={onLongPress}
            />
          ))
        }
      </ContactsResult>
    </View>
  );
}

type ResultProps = {
  suggestions: ReturnType<typeof useContactSuggestions>;
  children: (matches: Person[]) => React.ReactNode;
};

function ContactsResult({ suggestions, children }: ResultProps) {
  const { t } = useTranslation('friends');
  const { result, errorCode } = suggestions;
  if (errorCode) return <EmptyState message={t(`errors:rpc.${errorCode}`)} />;
  if (!result) return null;
  if (result.status === 'denied') return <EmptyState message={t('contacts.denied')} />;
  if (result.matches.length === 0) return <EmptyState message={t('contacts.empty')} />;
  return <View style={listStyles.list}>{children(result.matches)}</View>;
}
