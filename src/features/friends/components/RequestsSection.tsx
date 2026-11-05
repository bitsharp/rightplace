import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';

import { useAcceptFollow, useDeclineFollow, useFollowRequests } from '../hooks';
import { listStyles } from './listStyles';
import { RequestRow } from './RequestRow';

export function RequestsSection() {
  const { t } = useTranslation('friends');
  const requests = useFollowRequests();
  const accept = useAcceptFollow();
  const decline = useDeclineFollow();
  if (!requests.data || requests.data.length === 0) return null;
  return (
    <View style={listStyles.section}>
      <MonoLabel tone="going" size="medium">
        {t('requests.title')}
      </MonoLabel>
      <View style={listStyles.list}>
        {requests.data.map((request) => (
          <RequestRow
            key={request.userId}
            request={request}
            onAccept={(userId) => accept.mutate(userId)}
            onDecline={(userId) => decline.mutate(userId)}
          />
        ))}
      </View>
    </View>
  );
}
