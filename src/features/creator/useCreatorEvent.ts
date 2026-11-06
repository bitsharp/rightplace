import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useEventDetail } from '@/features/events/hooks';
import { useTargetLabel, useWhenLabel } from '@/features/events/useEventLabels';
import { statsView } from '@/features/venue/domain/statsState';

import { canEdit } from './domain/eventRow';
import { useCancelEvent, useEventAttendance } from './hooks';
import { useCreatorNavigation } from './useCreatorNavigation';

export function useCreatorEvent(eventId: string) {
  const { t } = useTranslation('creator');
  const navigation = useCreatorNavigation();
  const detail = useEventDetail(eventId);
  const event = detail.data ?? null;
  // The attendance RPC is creator-only: do not even ask for somebody else's event.
  const attendance = useEventAttendance(eventId, event?.isMine === true);
  const cancel = useCancelEvent();
  const [confirming, setConfirming] = useState(false);
  const whenLabel = useWhenLabel();
  const targetLabel = useTargetLabel();

  return {
    event,
    notFound: detail.isError || (event !== null && !event.isMine),
    mine: event?.isMine === true,
    meta: event ? `${event.venueName} · ${t(`venues:kind.${event.venueKind}`)}` : '',
    whenLabel: event ? whenLabel(event.startsAt, event.endsAt, event.timezone) : '',
    targetLabel: event ? targetLabel(event.ageBands, event.genders) : '',
    bands: attendance.data ?? null,
    stats: attendance.data ? statsView(attendance.data, 'all') : null,
    cancelled: event?.cancelledAt != null,
    editable: event ? canEdit(event, new Date()) : false,
    confirming,
    askCancel: () => setConfirming(true),
    keep: () => setConfirming(false),
    confirmCancel: () => {
      setConfirming(false);
      cancel.mutate(eventId);
    },
    cancelling: cancel.isPending,
    openEdit: () => navigation.openEdit(eventId),
    goBack: navigation.goBack,
  };
}
