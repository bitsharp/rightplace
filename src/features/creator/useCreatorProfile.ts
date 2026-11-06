import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';
import { useTargetLabel, useWhenLabel } from '@/features/events/useEventLabels';

import type { CreatorEvent, EventScope } from './api';
import { useMyEvents } from './hooks';
import { useCreatorNavigation } from './useCreatorNavigation';

export type EventRowData = {
  id: string;
  name: string;
  meta: string;
  whenLabel: string;
  targetLabel: string;
  event: CreatorEvent;
};

export function useCreatorProfile() {
  const { t } = useTranslation('creator');
  const { profile } = useSession();
  const navigation = useCreatorNavigation();
  const [scope, setScope] = useState<EventScope>('upcoming');
  const isCreator = profile?.isCreator === true;
  // Non creators never ask: the RPC would answer NOT_CREATOR anyway.
  const events = useMyEvents(scope, isCreator);
  const whenLabel = useWhenLabel();
  const targetLabel = useTargetLabel();

  const rows: EventRowData[] = (events.data ?? []).map((event) => ({
    id: event.eventId,
    name: event.name,
    meta: `${event.venueName} · ${t(`venues:kind.${event.venueKind}`)}`,
    whenLabel: whenLabel(event.startsAt, event.endsAt, event.timezone),
    targetLabel: targetLabel(event.ageBands, event.genders),
    event,
  }));

  return {
    isCreator,
    handle: profile?.handle ?? '',
    scope,
    setScope,
    rows,
    loaded: events.isSuccess,
    loadFailed: events.isError,
    ...navigation,
  };
}
