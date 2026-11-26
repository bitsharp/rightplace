import {
  buildFriendsLayers,
  buildGeneralLayers,
  featuredHotSpot,
  friendFacesOf,
  shownFaceIds,
  type HotSpotVenue,
  type MapVenue,
} from './mapLayers';

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
  friendIds: null,
  friendsCount: null,
  isSpot: false,
  isEstimate: false,
  ...overrides,
});

const ids = (rows: MapVenue[]) => rows.map((row) => row.venueId);

describe('buildGeneralLayers', () => {
  it('3 righe con is_hot_spot = true diventano 3 punti caldi, nello stesso ordine', () => {
    const layers = buildGeneralLayers([
      venue({ venueId: 'a', isHotSpot: true, goingBand: '3–10' }),
      venue({ venueId: 'b', isHotSpot: true, goingBand: '10–20' }),
      venue({ venueId: 'c', isHotSpot: true, goingBand: '3–10' }),
    ]);
    expect(ids(layers.hotSpots)).toEqual(['a', 'b', 'c']);
  });

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
    expect(layers).toEqual({ hotSpots: [], spots: [], typicalDots: [] });
  });

  it('un locale sponsorizzato senza affluenza né typical non disegna nulla sulla mappa', () => {
    const layers = buildGeneralLayers([venue({ venueId: 'ad', isSponsored: true })]);
    expect(layers).toEqual({ hotSpots: [], spots: [], typicalDots: [] });
  });

  it('mantiene l’ordine ricevuto dal server', () => {
    const layers = buildGeneralLayers([
      venue({ venueId: 'b', typicalLevel: 1 }),
      venue({ venueId: 'a', typicalLevel: 3 }),
    ]);
    expect(ids(layers.typicalDots)).toEqual(['b', 'a']);
  });
});

describe('friendFacesOf', () => {
  it('abbina handle e id nello stesso ordine', () => {
    expect(friendFacesOf(['volpe.viola', 'orso.grigio'], ['u-volpe', 'u-orso'])).toEqual([
      { userId: 'u-volpe', handle: 'volpe.viola' },
      { userId: 'u-orso', handle: 'orso.grigio' },
    ]);
  });

  it('senza id (vista generale) non produce volti', () => {
    expect(friendFacesOf(['volpe.viola'], null)).toEqual([]);
  });
});

describe('shownFaceIds', () => {
  it('chiede solo le foto che le righe disegnano (i primi due volti), non tutti gli amici', () => {
    const rows = [{ friendIds: ['a', 'b', 'c'] }, { friendIds: ['d'] }, { friendIds: null }];
    expect(shownFaceIds(rows, 2)).toEqual(['a', 'b', 'd']);
  });
});

describe('buildFriendsLayers', () => {
  const friendRows = [
    venue({
      venueId: 'arena',
      name: 'Arena',
      friendsCount: 2,
      friendsGoing: ['volpe.viola', 'orso.grigio'],
      friendIds: ['u-volpe', 'u-orso'],
    }),
    venue({
      venueId: 'bar',
      name: 'Bar',
      friendsCount: 1,
      friendsGoing: ['gatto.blu'],
      friendIds: ['u-gatto'],
    }),
    venue({
      venueId: 'club',
      name: 'Club',
      friendsCount: 1,
      friendsGoing: ['panda.rosa'],
      friendIds: ['u-panda'],
    }),
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
      {
        venueId: 'arena',
        name: 'Arena',
        handles: ['volpe.viola', 'orso.grigio'],
        friendIds: ['u-volpe', 'u-orso'],
        count: 2,
      },
      { venueId: 'bar', name: 'Bar', handles: ['gatto.blu'], friendIds: ['u-gatto'], count: 1 },
      { venueId: 'club', name: 'Club', handles: ['panda.rosa'], friendIds: ['u-panda'], count: 1 },
    ]);
  });

  it('senza amici nei locali la lista è vuota', () => {
    const layers = buildFriendsLayers([], [venue({ venueId: 'q', typicalLevel: 2 })]);
    expect(layers.friendVenues).toEqual([]);
    expect(layers.hotSpots).toEqual([]);
    expect(ids(layers.typicalDots)).toEqual(['q']);
  });
});

describe('spot (strato "stasera", mai con numeri sotto k)', () => {
  const spot = (id: string, overrides: Partial<MapVenue> = {}) =>
    venue({
      venueId: id,
      kind: 'spot',
      isSpot: true,
      isEstimate: false,
      goingBand: null,
      maybeBand: null,
      ...overrides,
    });

  it('uno spot sotto k va nello strato spot, non tra punti caldi né typical dot', () => {
    const layers = buildGeneralLayers([spot('s1'), venue({ venueId: 'v', typicalLevel: 2 })]);
    expect(ids(layers.spots)).toEqual(['s1']);
    expect(layers.hotSpots).toEqual([]);
    expect(ids(layers.typicalDots)).toEqual(['v']);
  });

  it('a 3 dichiarazioni lo spot è un punto caldo normale, non più uno spot', () => {
    const layers = buildGeneralLayers([
      spot('s1', { isHotSpot: true, goingBand: '3–10', maybeBand: 'pochi' }),
    ]);
    expect(ids(layers.hotSpots)).toEqual(['s1']);
    expect(layers.spots).toEqual([]);
  });

  it('un punto caldo senza fasce non esiste: non si disegna con un "pochi" inventato', () => {
    const layers = buildGeneralLayers([spot('odd', { isHotSpot: true })]);
    expect(layers.hotSpots).toEqual([]);
  });

  it('la mappa amici disegna come spot quelli sotto k con amici, con il loro conteggio', () => {
    const layers = buildFriendsLayers(
      [
        spot('s1', { friendsCount: 1, friendsGoing: ['volpe.viola'] }),
        spot('s2', { friendsCount: 0, friendsGoing: [] }),
        venue({ venueId: 'v', friendsCount: 2, friendsGoing: ['a.b', 'c.d'] }),
      ],
      [],
    );
    expect(ids(layers.spots)).toEqual(['s1']);
    expect(ids(layers.hotSpots)).toEqual(['v']);
    expect(layers.friendVenues.map((row) => row.venueId)).toEqual(['v', 's1']);
  });
});

describe('featuredHotSpot', () => {
  const hot = (venueId: string, goingBand: HotSpotVenue['goingBand'], name = venueId) =>
    venue({ venueId, name, isHotSpot: true, goingBand, maybeBand: 'pochi' }) as HotSpotVenue;

  it('sceglie il punto caldo con la fascia dei "Ci vado" più alta', () => {
    const rows = [hot('a', '3–10'), hot('b', '30–50'), hot('c', '10–20')];
    expect(featuredHotSpot(rows, [])?.venueId).toBe('b');
  });

  it('a parità di fascia vince il nome in ordine alfabetico, così la card non salta da un giro all’altro', () => {
    const rows = [hot('z', '10–20', 'Zeta'), hot('a', '10–20', 'Alfa')];
    expect(featuredHotSpot(rows, [])?.venueId).toBe('a');
  });

  it('salta i locali già mostrati da un’altra card (la mia serata, la sponsorizzata)', () => {
    const rows = [hot('a', '30–50'), hot('b', '10–20')];
    expect(featuredHotSpot(rows, ['a'])?.venueId).toBe('b');
  });

  it('senza punti caldi non c’è nessuna card', () => {
    expect(featuredHotSpot([], [])).toBeNull();
  });
});
