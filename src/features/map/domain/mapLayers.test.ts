import { buildFriendsLayers, buildGeneralLayers, mapBanner, type MapVenue } from './mapLayers';

const venue = (overrides: Partial<MapVenue> & { venueId: string }): MapVenue => ({
  name: `Locale ${overrides.venueId}`,
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typicalLevel: 0,
  goingBand: 'pochi',
  maybeBand: 'pochi',
  isHotSpot: false,
  isSponsored: false,
  friendsGoing: null,
  friendsCount: null,
  ...overrides,
});

const ids = (rows: MapVenue[]) => rows.map((row) => row.venueId);

describe('buildGeneralLayers', () => {
  it('un locale con fascia visibile è un punto caldo e non anche un typical dot', () => {
    const layers = buildGeneralLayers([
      venue({ venueId: 'hot', isHotSpot: true, goingBand: '3–10', typicalLevel: 2 }),
    ]);
    expect(ids(layers.hotSpots)).toEqual(['hot']);
    expect(layers.typicalDots).toEqual([]);
  });

  it('2 dichiarati con typical 2 → typical dot (la fascia resta "pochi")', () => {
    const layers = buildGeneralLayers([venue({ venueId: 'few', typicalLevel: 2 })]);
    expect(layers.hotSpots).toEqual([]);
    expect(ids(layers.typicalDots)).toEqual(['few']);
  });

  it('2 dichiarati con typical 0 → il locale non compare in nessuno strato', () => {
    const layers = buildGeneralLayers([venue({ venueId: 'empty', typicalLevel: 0 })]);
    expect(layers).toEqual({ hotSpots: [], typicalDots: [] });
  });

  it('un locale sponsorizzato senza affluenza né typical non disegna nulla sulla mappa', () => {
    const layers = buildGeneralLayers([venue({ venueId: 'ad', isSponsored: true })]);
    expect(layers).toEqual({ hotSpots: [], typicalDots: [] });
  });

  it('mantiene l’ordine ricevuto dal server', () => {
    const layers = buildGeneralLayers([
      venue({ venueId: 'b', typicalLevel: 1 }),
      venue({ venueId: 'a', typicalLevel: 3 }),
    ]);
    expect(ids(layers.typicalDots)).toEqual(['b', 'a']);
  });
});

describe('buildFriendsLayers', () => {
  const friendRows = [
    venue({
      venueId: 'arena',
      name: 'Arena',
      friendsCount: 2,
      friendsGoing: ['volpe.viola', 'orso.grigio'],
    }),
    venue({ venueId: 'bar', name: 'Bar', friendsCount: 1, friendsGoing: ['gatto.blu'] }),
    venue({ venueId: 'club', name: 'Club', friendsCount: 1, friendsGoing: ['panda.rosa'] }),
    venue({ venueId: 'nobody', friendsCount: 0, friendsGoing: [] }),
  ];

  it('mostra punti caldi solo per i locali con amici', () => {
    const layers = buildFriendsLayers(friendRows, []);
    expect(ids(layers.hotSpots)).toEqual(['arena', 'bar', 'club']);
  });

  it('i typical dot restano nella vista amici, ma non sopra un punto caldo amici', () => {
    const general = [
      venue({ venueId: 'arena', typicalLevel: 3 }),
      venue({ venueId: 'quiet', typicalLevel: 1 }),
      venue({ venueId: 'closed', typicalLevel: 0 }),
    ];
    const layers = buildFriendsLayers(friendRows, general);
    expect(ids(layers.typicalDots)).toEqual(['quiet']);
  });

  it('elenca i locali degli amici per numero di amici decrescente, poi per nome', () => {
    const layers = buildFriendsLayers(friendRows, []);
    expect(layers.friendVenues).toEqual([
      { venueId: 'arena', name: 'Arena', handles: ['volpe.viola', 'orso.grigio'], count: 2 },
      { venueId: 'bar', name: 'Bar', handles: ['gatto.blu'], count: 1 },
      { venueId: 'club', name: 'Club', handles: ['panda.rosa'], count: 1 },
    ]);
  });

  it('senza amici nei locali la lista è vuota', () => {
    const layers = buildFriendsLayers([], [venue({ venueId: 'q', typicalLevel: 2 })]);
    expect(layers.friendVenues).toEqual([]);
    expect(layers.hotSpots).toEqual([]);
    expect(ids(layers.typicalDots)).toEqual(['q']);
  });
});

describe('mapBanner', () => {
  const hot = venue({ venueId: 'h', isHotSpot: true });
  const dot = venue({ venueId: 'd', typicalLevel: 1 });

  it('nessun banner quando c’è almeno un punto caldo', () => {
    expect(mapBanner({ hotSpots: [hot], typicalDots: [dot] })).toBe('none');
    expect(mapBanner({ hotSpots: [hot], typicalDots: [] })).toBe('none');
  });

  it('"solo di solito" quando ci sono solo typical dot', () => {
    expect(mapBanner({ hotSpots: [], typicalDots: [dot] })).toBe('typicalOnly');
  });

  it('"vuoto" quando non c’è né uno né l’altro', () => {
    expect(mapBanner({ hotSpots: [], typicalDots: [] })).toBe('empty');
  });
});
