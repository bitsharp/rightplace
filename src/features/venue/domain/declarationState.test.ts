import type { MyDeclaration } from '@/features/map/api';

import { declarationFor } from './declarationState';

const mine: MyDeclaration = {
  venueId: 'v1',
  venueName: 'Arena Club',
  eventId: null,
  intent: 'going',
  expiresAt: '2026-11-07T04:00:00Z',
};

describe('declarationFor', () => {
  it('senza dichiarazione: none', () => {
    expect(declarationFor(null, { kind: 'night', id: 'v1' })).toEqual({ kind: 'none' });
  });

  it('serata dello stesso locale: here con intenzione e scadenza', () => {
    expect(declarationFor(mine, { kind: 'night', id: 'v1' })).toEqual({
      kind: 'here',
      intent: 'going',
      expiresAt: '2026-11-07T04:00:00Z',
    });
  });

  it('dichiarazione in un altro locale: elsewhere con il nome del locale', () => {
    expect(declarationFor(mine, { kind: 'night', id: 'v2' })).toEqual({
      kind: 'elsewhere',
      venueName: 'Arena Club',
    });
  });

  it('per un evento il confronto è sull’id dell’evento', () => {
    const atEvent = { ...mine, eventId: 'e1', intent: 'maybe' as const };
    expect(declarationFor(atEvent, { kind: 'event', id: 'e1' })).toEqual({
      kind: 'here',
      intent: 'maybe',
      expiresAt: mine.expiresAt,
    });
    expect(declarationFor(atEvent, { kind: 'event', id: 'e2' }).kind).toBe('elsewhere');
  });

  it('una dichiarazione a una serata non vale per un evento', () => {
    expect(declarationFor(mine, { kind: 'event', id: 'v1' }).kind).toBe('elsewhere');
  });
});
