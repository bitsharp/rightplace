import { useState } from 'react';

import { useVenueDetail } from '@/features/venue/hooks';
import { rpcErrorCodeOf, type RpcErrorCode } from '@/lib/rpcError';

import { useCreateEvent, useUpdateEvent } from './hooks';
import {
  defaultEnd,
  defaultStart,
  validateEventForm,
  type EventFormErrors,
  type EventFormField,
} from './domain/eventForm';
import { fromTargetArrays, type AgeChip, type GenderChip } from './domain/target';
import { instantFromWallTime, shiftWallTime, wallTimeIn, type WallTime } from './domain/zonedTime';

export type EditingEvent = {
  eventId: string;
  venueId: string;
  timeZone: string;
  name: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  ageBands: string[];
  genders: string[];
};

type Options = { editing?: EditingEvent; onDone?: () => void };

const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Start and end are derived until the user touches them; once touched they are kept as wall-clock
// times, so choosing a venue in another time zone afterwards does not shift what was typed.
function useSchedule(timeZone: string, editing: EditingEvent | undefined) {
  const [now] = useState(() => new Date());
  const [startWall, setStartWall] = useState<WallTime | null>(
    editing ? wallTimeIn(editing.startsAt, editing.timeZone) : null,
  );
  const [endWall, setEndWall] = useState<WallTime | null>(
    editing ? wallTimeIn(editing.endsAt, editing.timeZone) : null,
  );
  const startsAt = startWall
    ? instantFromWallTime(startWall, timeZone)
    : defaultStart(now, timeZone);
  const endsAt = endWall ? instantFromWallTime(endWall, timeZone) : defaultEnd(startsAt, timeZone);
  const moved = (instant: Date, minutes: number) =>
    shiftWallTime(wallTimeIn(instant, timeZone), minutes);

  return {
    startsAt,
    endsAt,
    shiftStart: (minutes: number) => {
      setStartWall(moved(startsAt, minutes));
      // an end the user already chose keeps its distance from the start
      if (endWall) setEndWall(moved(endsAt, minutes));
    },
    shiftEnd: (minutes: number) => setEndWall(moved(endsAt, minutes)),
  };
}

function useTarget(editing: EditingEvent | undefined) {
  const initial = editing ? fromTargetArrays(editing.ageBands, editing.genders) : null;
  const [ages, setAges] = useState<AgeChip[]>(initial?.ages ?? []);
  const [gender, setGender] = useState<GenderChip>(initial?.gender ?? 'all');
  return { ages, setAges, gender, setGender };
}

// Text and venue fields: editing one of them clears the error shown under it.
function useFields(editing: EditingEvent | undefined, onEdit: (field: EventFormField) => void) {
  const [venueId, setVenueId] = useState<string | null>(editing?.venueId ?? null);
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const edited =
    <T>(field: EventFormField, set: (value: T) => void) =>
    (value: T) => {
      onEdit(field);
      set(value);
    };
  return {
    venueId,
    setVenueId: edited('venue', setVenueId),
    name,
    setName: edited('name', setName),
    description,
    setDescription: edited('description', setDescription),
  };
}

export function useEventForm({ editing, onDone }: Options = {}) {
  const [errors, setErrors] = useState<EventFormErrors>({});
  const fields = useFields(editing, (field) =>
    setErrors((current) => ({ ...current, [field]: undefined })),
  );
  const detail = useVenueDetail(fields.venueId ?? '', fields.venueId !== null && !editing);
  const timeZone = editing?.timeZone ?? detail.data?.timezone ?? deviceTimeZone();
  const schedule = useSchedule(timeZone, editing);
  const target = useTarget(editing);
  const create = useCreateEvent();
  const update = useUpdateEvent(editing?.eventId ?? '');
  const mutation = editing ? update : create;

  const submit = () => {
    const { venueId, name, description } = fields;
    const result = validateEventForm(
      { venueId, name, description, ...schedule, ...target },
      { now: new Date(), timeZone },
    );
    setErrors(result.ok ? {} : result.errors);
    if (result.ok) mutation.mutate(result.input, { onSuccess: onDone });
  };

  return {
    ...fields,
    timeZone,
    ...schedule,
    ...target,
    errors,
    serverError: rpcErrorCodeOf(mutation.error) satisfies RpcErrorCode | null,
    submitting: mutation.isPending,
    submit,
  };
}
