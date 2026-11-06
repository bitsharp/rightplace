import { defaultEnd, defaultStart, validateEventForm, type EventFormValues } from './eventForm';
import { instantFromWallTime, wallTimeIn } from './zonedTime';

const ROME = 'Europe/Rome';
// Friday 6 Nov 2026, 15:00 in Milan.
const NOW = new Date('2026-11-06T14:00:00Z');
const context = { now: NOW, timeZone: ROME };
const at = (month: number, day: number, hour: number, minute = 0) =>
  instantFromWallTime({ year: 2026, month, day, hour, minute }, ROME);

const valid: EventFormValues = {
  venueId: 'venue-1',
  name: 'Notte Techno',
  description: '',
  startsAt: at(11, 7, 22),
  endsAt: at(11, 8, 4),
  ages: [],
  gender: 'all',
};

const errorsOf = (overrides: Partial<EventFormValues>) => {
  const result = validateEventForm({ ...valid, ...overrides }, context);
  return result.ok ? null : result.errors;
};

describe('validateEventForm', () => {
  it('accetta una serata completa e produce l’input per create_event', () => {
    const result = validateEventForm(
      {
        ...valid,
        name: '  Notte Techno  ',
        description: ' Dj set ',
        ages: ['35+'],
        gender: 'female',
      },
      context,
    );
    expect(result).toEqual({
      ok: true,
      input: {
        venueId: 'venue-1',
        name: 'Notte Techno',
        description: 'Dj set',
        startsAt: '2026-11-07T21:00:00.000Z',
        endsAt: '2026-11-08T03:00:00.000Z',
        ageBands: ['35-44', '45+'],
        genders: ['female'],
      },
    });
  });

  it('target vuoto significa "Tutti": array vuoti', () => {
    const result = validateEventForm(valid, context);
    expect(result.ok && result.input).toMatchObject({ ageBands: [], genders: [] });
  });

  it('una descrizione vuota diventa null', () => {
    const result = validateEventForm({ ...valid, description: '   ' }, context);
    expect(result.ok && result.input.description).toBeNull();
  });

  it('richiede il luogo', () => {
    expect(errorsOf({ venueId: null })).toEqual({ venue: 'venueRequired' });
  });

  it('richiede il nome e lo limita a 80 caratteri', () => {
    expect(errorsOf({ name: '   ' })).toEqual({ name: 'nameRequired' });
    expect(errorsOf({ name: 'x'.repeat(81) })).toEqual({ name: 'nameTooLong' });
    expect(errorsOf({ name: 'x'.repeat(80) })).toBeNull();
  });

  it('limita la descrizione a 500 caratteri', () => {
    expect(errorsOf({ description: 'd'.repeat(501) })).toEqual({
      description: 'descriptionTooLong',
    });
    expect(errorsOf({ description: 'd'.repeat(500) })).toBeNull();
  });

  it('rifiuta un inizio nel passato', () => {
    expect(errorsOf({ startsAt: at(11, 6, 12), endsAt: at(11, 6, 14) })).toEqual({
      startsAt: 'startInPast',
    });
  });

  it('rifiuta un inizio oltre 60 giorni', () => {
    const nextYear = (day: number, hour: number) =>
      instantFromWallTime({ year: 2027, month: 1, day, hour, minute: 0 }, ROME);
    expect(errorsOf({ startsAt: nextYear(10, 22), endsAt: nextYear(11, 2) })).toEqual({
      startsAt: 'startTooFar',
    });
  });

  it('rifiuta una fine non dopo l’inizio', () => {
    expect(errorsOf({ endsAt: valid.startsAt })).toEqual({ endsAt: 'endBeforeStart' });
  });

  it('accetta la fine alle 06:00 esatte e rifiuta le 06:01 del giorno dopo', () => {
    expect(errorsOf({ endsAt: at(11, 8, 6, 0) })).toBeNull();
    expect(errorsOf({ endsAt: at(11, 8, 6, 1) })).toEqual({ endsAt: 'endAfterNight' });
  });

  it('per una serata che inizia dopo mezzanotte il limite è le 06:00 dello stesso giorno', () => {
    const afterMidnight = { startsAt: at(11, 8, 1), endsAt: at(11, 8, 6, 30) };
    expect(errorsOf(afterMidnight)).toEqual({ endsAt: 'endAfterNight' });
    expect(errorsOf({ ...afterMidnight, endsAt: at(11, 8, 6) })).toBeNull();
  });

  it('usa il fuso della città: 06:00 a Las Palmas non sono le 06:00 di Milano', () => {
    const canary = { now: NOW, timeZone: 'Atlantic/Canary' };
    const result = validateEventForm(
      {
        ...valid,
        startsAt: new Date('2026-11-07T22:00:00Z'),
        endsAt: new Date('2026-11-08T06:00:00Z'),
      },
      canary,
    );
    expect(result.ok).toBe(true);
  });

  it('segnala più campi insieme, uno solo per campo', () => {
    expect(errorsOf({ venueId: null, name: '' })).toEqual({
      venue: 'venueRequired',
      name: 'nameRequired',
    });
  });
});

describe('defaultEnd', () => {
  it('è l’inizio più 6 ore', () => {
    expect(wallTimeIn(defaultEnd(at(11, 7, 20), ROME), ROME)).toMatchObject({ day: 8, hour: 2 });
  });

  it('non supera le 06:00 del giorno dopo la data-serata', () => {
    expect(wallTimeIn(defaultEnd(at(11, 7, 23), ROME), ROME)).toMatchObject({ day: 8, hour: 5 });
    expect(wallTimeIn(defaultEnd(at(11, 7, 23, 30), ROME), ROME)).toMatchObject({
      day: 8,
      hour: 5,
      minute: 30,
    });
    expect(wallTimeIn(defaultEnd(at(11, 8, 2), ROME), ROME)).toMatchObject({
      day: 8,
      hour: 6,
      minute: 0,
    });
  });
});

describe('defaultStart', () => {
  it('di pomeriggio propone le 22:00 di oggi', () => {
    expect(wallTimeIn(defaultStart(NOW, ROME), ROME)).toMatchObject({
      day: 6,
      hour: 22,
      minute: 0,
    });
  });

  it('a tarda sera propone le 22:00 di domani', () => {
    const late = new Date('2026-11-06T21:30:00Z');
    expect(wallTimeIn(defaultStart(late, ROME), ROME)).toMatchObject({ day: 7, hour: 22 });
  });
});
