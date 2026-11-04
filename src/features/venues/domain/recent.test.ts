import { MAX_RECENT_VENUES, parseRecentVenues } from './recent';

const row = (id: string, name: string, searchedAt: string) => ({
  venue_id: id,
  searched_at: searchedAt,
  venues: { name, is_active: true },
});

describe('parseRecentVenues', () => {
  it('ordina dal più recente e restituisce id e nome', () => {
    const rows = [
      row('a', 'Vecchio', '2026-11-01T10:00:00Z'),
      row('b', 'Nuovo', '2026-11-03T10:00:00Z'),
    ];
    expect(parseRecentVenues(rows)).toEqual([
      { venueId: 'b', name: 'Nuovo' },
      { venueId: 'a', name: 'Vecchio' },
    ]);
  });

  it('tiene al massimo 8 locali', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row(`v${i}`, `Locale ${i}`, `2026-11-01T10:${String(i).padStart(2, '0')}:00Z`),
    );
    const recents = parseRecentVenues(rows);
    expect(recents).toHaveLength(MAX_RECENT_VENUES);
    expect(recents[0]?.venueId).toBe('v11');
  });

  it('scarta righe malformate, senza locale o con locale non più attivo', () => {
    const rows = [
      row('ok', 'Buono', '2026-11-03T10:00:00Z'),
      { venue_id: 'x', searched_at: '2026-11-03T11:00:00Z', venues: null },
      { venue_id: 'y', searched_at: 'ieri', venues: { name: 'Data rotta', is_active: true } },
      { venue_id: 'z', searched_at: '2026-11-03T12:00:00Z', venues: { name: 42, is_active: true } },
      {
        venue_id: 'w',
        searched_at: '2026-11-03T13:00:00Z',
        venues: { name: 'Spento', is_active: false },
      },
      'spazzatura',
      null,
    ];
    expect(parseRecentVenues(rows)).toEqual([{ venueId: 'ok', name: 'Buono' }]);
  });

  it('non crasha se non riceve un array', () => {
    expect(parseRecentVenues(null)).toEqual([]);
  });
});
