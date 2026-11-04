import {
  filterVenues,
  mergeVenueBands,
  sortVenues,
  type VenueKind,
  type VenueListItem,
} from './venueList';

const item = (overrides: Partial<VenueListItem> & { name: string }): VenueListItem => ({
  id: overrides.name,
  kind: 'club',
  cityName: 'Milano',
  goingBand: 'pochi',
  maybeBand: 'pochi',
  isSponsored: false,
  ...overrides,
});

describe('sortVenues', () => {
  it('mette i sponsorizzati prima di tutto, anche con meno affluenza', () => {
    const rows = [
      item({ name: 'Affollato', goingBand: '100+' }),
      item({ name: 'Sponsor', isSponsored: true }),
    ];
    expect(sortVenues(rows).map((r) => r.name)).toEqual(['Sponsor', 'Affollato']);
  });

  it('ordina per affluenza sommando SI e FORSE, decrescente', () => {
    const rows = [
      item({ name: 'Poca', goingBand: '3–10', maybeBand: 'pochi' }),
      item({ name: 'Somma alta', goingBand: '10–20', maybeBand: '10–20' }),
      item({ name: 'Solo SI', goingBand: '20–30', maybeBand: 'pochi' }),
    ];
    expect(sortVenues(rows).map((r) => r.name)).toEqual(['Somma alta', 'Solo SI', 'Poca']);
  });

  it('a parità di affluenza ordina per nome, con le regole dell’italiano', () => {
    const rows = [item({ name: 'Zeta' }), item({ name: 'élite' }), item({ name: 'Alfa' })];
    expect(sortVenues(rows).map((r) => r.name)).toEqual(['Alfa', 'élite', 'Zeta']);
  });

  it('non modifica l’array ricevuto', () => {
    const rows = [item({ name: 'B' }), item({ name: 'A' })];
    sortVenues(rows);
    expect(rows.map((r) => r.name)).toEqual(['B', 'A']);
  });
});

describe('filterVenues', () => {
  const rows = [
    item({ name: 'Bar Brera', kind: 'bar' }),
    item({ name: 'Città Alta Club', kind: 'club' }),
    item({ name: 'Terrazza', kind: 'rooftop' }),
  ];

  it('senza filtri restituisce tutto', () => {
    expect(filterVenues(rows, { kind: null, query: '' })).toHaveLength(3);
  });

  it('filtra per tipo', () => {
    const kind: VenueKind = 'rooftop';
    expect(filterVenues(rows, { kind, query: '' }).map((r) => r.name)).toEqual(['Terrazza']);
  });

  it('cerca nel nome ignorando maiuscole e accenti', () => {
    expect(filterVenues(rows, { kind: null, query: 'CITTA' }).map((r) => r.name)).toEqual([
      'Città Alta Club',
    ]);
    expect(filterVenues(rows, { kind: null, query: 'cittÀ alta' })).toHaveLength(1);
  });

  it('combina tipo e testo e ignora gli spazi attorno alla ricerca', () => {
    expect(filterVenues(rows, { kind: 'bar', query: '  brera ' }).map((r) => r.name)).toEqual([
      'Bar Brera',
    ]);
    expect(filterVenues(rows, { kind: 'club', query: 'brera' })).toEqual([]);
  });
});

describe('mergeVenueBands', () => {
  const venues = [
    { id: 'a', name: 'A', kind: 'club' as const, cityName: 'Milano' },
    { id: 'b', name: 'B', kind: 'bar' as const, cityName: 'Milano' },
  ];

  it('abbina le fasce ai locali per id', () => {
    const bands = new Map([
      ['a', { goingBand: '20–30' as const, maybeBand: '3–10' as const, isSponsored: true }],
    ]);
    expect(mergeVenueBands(venues, bands)[0]).toEqual({
      ...venues[0],
      goingBand: '20–30',
      maybeBand: '3–10',
      isSponsored: true,
    });
  });

  it('senza fasce (ancora in caricamento o fuori dai primi 50) mostra "pochi" e non sponsorizzato', () => {
    expect(mergeVenueBands(venues, new Map())[1]).toEqual({
      ...venues[1],
      goingBand: 'pochi',
      maybeBand: 'pochi',
      isSponsored: false,
    });
  });
});
