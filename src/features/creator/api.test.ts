import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import { cancelEvent, createEvent, fetchEventAttendance, fetchMyEvents, updateEvent } from './api';
import type { EventInput } from './domain/eventForm';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

const input: EventInput = {
  venueId: 'v1',
  name: 'Notte Techno',
  description: null,
  startsAt: '2026-11-07T21:00:00.000Z',
  endsAt: '2026-11-08T03:00:00.000Z',
  ageBands: ['35-44', '45+'],
  genders: [],
};

const eventRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  description: null,
  venue_id: 'v1',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  starts_at: '2026-11-07T21:00:00+00:00',
  ends_at: '2026-11-08T03:00:00+00:00',
  cancelled_at: null,
  going_band: '3–10',
  maybe_band: 'pochi',
  target_age_bands: ['18-24'],
  target_genders: [],
  is_sponsored: false,
  can_edit: true,
  timezone: 'Europe/Rome',
  ...overrides,
});

describe('createEvent', () => {
  it('chiama create_event con i parametri del server e restituisce l’id', async () => {
    respondWith('e1');
    await expect(createEvent(input)).resolves.toBe('e1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('create_event', {
      p_venue_id: 'v1',
      p_name: 'Notte Techno',
      p_description: null,
      p_starts_at: '2026-11-07T21:00:00.000Z',
      p_ends_at: '2026-11-08T03:00:00.000Z',
      p_target_age_bands: ['35-44', '45+'],
      p_target_genders: [],
    });
  });

  it('propaga il codice del server (limite di 10 serate)', async () => {
    respondWith(null, { message: 'TOO_MANY_ACTIVE_EVENTS', code: 'P0001' });
    await expect(createEvent(input)).rejects.toMatchObject({ code: 'TOO_MANY_ACTIVE_EVENTS' });
  });
});

describe('updateEvent e cancelEvent', () => {
  it('update_event riceve l’id della serata e gli stessi campi', async () => {
    respondWith(null);
    await updateEvent('e1', input);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith(
      'update_event',
      expect.objectContaining({ p_event_id: 'e1', p_name: 'Notte Techno' }),
    );
  });

  it('cancel_event riceve solo l’id', async () => {
    respondWith(null);
    await cancelEvent('e1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('cancel_event', { p_event_id: 'e1' });
  });
});

describe('fetchMyEvents', () => {
  it('chiede lo scope e converte le righe (solo fasce, mai persone)', async () => {
    respondWith([eventRow()]);
    const [event] = await fetchMyEvents('upcoming');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_creator_events', { p_scope: 'upcoming' });
    expect(event).toEqual({
      eventId: 'e1',
      name: 'Notte Techno',
      description: null,
      venueId: 'v1',
      venueName: 'Arena Club',
      venueKind: 'club',
      startsAt: '2026-11-07T21:00:00+00:00',
      endsAt: '2026-11-08T03:00:00+00:00',
      cancelledAt: null,
      goingBand: '3–10',
      maybeBand: 'pochi',
      ageBands: ['18-24'],
      genders: [],
      isSponsored: false,
      canEdit: true,
      timezone: 'Europe/Rome',
    });
  });

  it('rifiuta una fascia sconosciuta (zod ai confini)', async () => {
    respondWith([eventRow({ going_band: '12' })]);
    await expect(fetchMyEvents('past')).rejects.toThrow();
  });
});

describe('fetchEventAttendance', () => {
  it('con meno di 3 persone età e genere sono null', async () => {
    respondWith([
      {
        going_band: 'pochi',
        maybe_band: 'pochi',
        avg_age: null,
        female_pct: null,
        male_pct: null,
        other_pct: null,
      },
    ]);
    await expect(fetchEventAttendance('e1')).resolves.toEqual({
      goingBand: 'pochi',
      maybeBand: 'pochi',
      avgAge: null,
      femalePct: null,
      malePct: null,
      otherPct: null,
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_event_attendance', { p_event_id: 'e1' });
  });

  it('senza righe la serata non c’è: NOT_FOUND', async () => {
    respondWith([]);
    await expect(fetchEventAttendance('e1')).rejects.toEqual(new RpcError('NOT_FOUND'));
  });
});
