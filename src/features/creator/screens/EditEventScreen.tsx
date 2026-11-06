import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { EventDetail } from '@/features/events/api';
import { useEventDetail } from '@/features/events/hooks';
import { spacing } from '@/theme/tokens';

import { CreatorShell } from '../components/CreatorShell';
import { EventForm } from '../components/EventForm';
import { canEdit } from '../domain/eventRow';
import { useCreatorNavigation } from '../useCreatorNavigation';
import { useEventForm, type EditingEvent } from '../useEventForm';

function editingFrom(detail: EventDetail): EditingEvent {
  return {
    eventId: detail.eventId,
    venueId: detail.venueId,
    timeZone: detail.timezone,
    name: detail.name,
    description: detail.description ?? '',
    startsAt: new Date(detail.startsAt),
    endsAt: new Date(detail.endsAt),
    ageBands: detail.ageBands,
    genders: detail.genders,
  };
}

export function EditEventScreen({ eventId }: { eventId: string }) {
  const { t } = useTranslation('creator');
  const { goBack } = useCreatorNavigation();
  const detail = useEventDetail(eventId);
  return (
    <CreatorShell title={t('editEvent')} onBack={goBack}>
      {detail.data ? <EditBody detail={detail.data} onDone={goBack} /> : null}
      {detail.isError ? <EmptyState message={t('attendance.notFound')} /> : null}
    </CreatorShell>
  );
}

function EditBody({ detail, onDone }: { detail: EventDetail; onDone: () => void }) {
  const { t } = useTranslation('creator');
  if (!detail.isMine) return <EmptyState message={t('attendance.notFound')} />;
  if (!canEdit(detail, new Date())) return <EmptyState message={t('form.notEditable')} />;
  return <EditForm detail={detail} onDone={onDone} />;
}

// Mounted only once the event is loaded: the form state starts from its values.
function EditForm({ detail, onDone }: { detail: EventDetail; onDone: () => void }) {
  const { t } = useTranslation('creator');
  const form = useEventForm({ editing: editingFrom(detail), onDone });
  const venues = [
    { id: detail.venueId, name: detail.venueName, kind: detail.venueKind, cityName: '' },
  ];
  return (
    <>
      <View style={styles.heading}>
        <MonoLabel tone="maybe" size="large">
          {t('form.editLabel')}
        </MonoLabel>
        <Text variant="display22">{t('form.editTitle')}</Text>
      </View>
      <EventForm form={form} venues={venues} mode="edit" />
    </>
  );
}

const styles = StyleSheet.create({ heading: { gap: spacing.sm } });
