import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { HotSpotVenue, MapVenue } from '../domain/mapLayers';

import { MapCanvas } from './MapCanvas';

const venue = (overrides: Partial<HotSpotVenue> & { venueId: string }): HotSpotVenue => ({
  name: `Locale ${overrides.venueId}`,
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typicalLevel: 0,
  goingBand: '3–10',
  maybeBand: 'pochi',
  isHotSpot: true,
  isSponsored: false,
  friendsGoing: null,
  friendIds: null,
  friendsCount: null,
  isSpot: false,
  ...overrides,
});

const city = { slug: 'milano', name: 'Milano', lat: 45.4642, lng: 9.19, defaultZoom: 13 };

const baseProps = {
  city,
  view: 'general' as const,
  you: null,
  onOpenVenue: jest.fn(),
};

const marker = (id: string) => screen.getByTestId(`marker-${id}`, { includeHiddenElements: true });
// iOS (the test default): the tap goes through the Pressable around the marker's whole content.
const tap = (id: string) => screen.getByTestId(`tap-marker-${id}`, { includeHiddenElements: true });

describe('MapCanvas', () => {
  it('non usa la posizione nativa, né POI né traffico: il "Tu" lo disegniamo noi', async () => {
    await render(<MapCanvas {...baseProps} layers={{ hotSpots: [], spots: [] }} />);
    expect(screen.getByTestId('map-view')).toHaveProp('showsUserLocation', false);
    expect(screen.getByTestId('map-view')).toHaveProp('showsPointsOfInterests', false);
    expect(screen.getByTestId('map-view')).toHaveProp('showsTraffic', false);
    expect(screen.getByTestId('map-view')).toHaveProp('userInterfaceStyle', 'dark');
  });

  it('mette il velo luminoso sopra la mappa, senza intercettare i gesti, con e senza pressione lunga', async () => {
    const layers = { hotSpots: [], spots: [] };
    const { rerender } = await render(<MapCanvas {...baseProps} layers={layers} />);
    const veil = () => screen.getByTestId('map-vignette', { includeHiddenElements: true });
    expect(veil().props.pointerEvents).toBe('none');
    await rerender(<MapCanvas {...baseProps} layers={layers} onPickSpot={jest.fn()} />);
    expect(veil().props.pointerEvents).toBe('none');
    expect(screen.getByTestId('map-press-surface')).toBeOnTheScreen();
  });

  it('parte dal centro della città', async () => {
    await render(<MapCanvas {...baseProps} layers={{ hotSpots: [], spots: [] }} />);
    expect(screen.getByTestId('map-view').props.initialRegion).toMatchObject({
      latitude: 45.4642,
      longitude: 9.19,
    });
  });

  it('non disegna nessun typical dot: i punti caldi stanno sotto il "Tu"', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        you={{ lat: 45.4625, lng: 9.1925 }}
        layers={{
          hotSpots: [venue({ venueId: 'hot' })],
          spots: [],
        }}
      />,
    );
    const z = (id: string) => Number(marker(id).props.zIndex);
    expect(screen.queryByTestId('marker-typical-dot', { includeHiddenElements: true })).toBeNull();
    expect(z('hot-hot')).toBeLessThan(z('you'));
  });

  it('mette il marker "Tu" solo se c’è una posizione grossolana', async () => {
    const { rerender } = await render(
      <MapCanvas {...baseProps} layers={{ hotSpots: [], spots: [] }} />,
    );
    expect(screen.queryByTestId('marker-you', { includeHiddenElements: true })).toBeNull();
    await rerender(
      <MapCanvas
        {...baseProps}
        you={{ lat: 45.4625, lng: 9.1925 }}
        layers={{ hotSpots: [], spots: [] }}
      />,
    );
    expect(marker('you').props.coordinate).toEqual({ latitude: 45.4625, longitude: 9.1925 });
  });

  it('dopo il primo render i marker non ridisegnano più la loro bitmap', async () => {
    await render(
      <MapCanvas {...baseProps} layers={{ hotSpots: [venue({ venueId: 'hot' })], spots: [] }} />,
    );
    expect(marker('hot-hot')).toHaveProp('tracksViewChanges', true);
    await waitFor(() => expect(marker('hot-hot')).toHaveProp('tracksViewChanges', false));
  });

  it('un tap sul marker del punto caldo apre il locale', async () => {
    const onOpenVenue = jest.fn();
    await render(
      <MapCanvas
        {...baseProps}
        onOpenVenue={onOpenVenue}
        layers={{
          hotSpots: [venue({ venueId: 'hot' })],
          spots: [],
        }}
      />,
    );
    await fireEvent.press(tap('hot-hot'));
    expect(onOpenVenue).toHaveBeenLastCalledWith('hot');
  });

  describe('vista amici: un tap sul marker apre il locale', () => {
    const withFriends = venue({
      venueId: 'hot',
      friendsGoing: ['volpe.viola'],
      friendIds: ['u-volpe'],
      friendsCount: 1,
    });

    it('chiama onOpenVenue anche con i volti', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          view="friends"
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [withFriends], spots: [] }}
        />,
      );
      await fireEvent.press(tap('hot-hot'));
      expect(onOpenVenue).toHaveBeenLastCalledWith('hot');
    });

    it('anche lo spot senza numeri apre il locale', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          view="friends"
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [], spots: [{ ...withFriends, venueId: 's1', isSpot: true }] }}
        />,
      );
      await fireEvent.press(tap('spot-s1'));
      expect(onOpenVenue).toHaveBeenLastCalledWith('s1');
    });
  });

  it('3 punti caldi in ingresso → 3 HotSpot disegnati sulla mappa', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        layers={{
          hotSpots: ['a', 'b', 'c'].map((venueId) => venue({ venueId, lat: 45.46, lng: 9.19 })),

          spots: [],
        }}
      />,
    );
    expect(screen.getAllByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveLength(
      3,
    );
    ['a', 'b', 'c'].forEach((id) => expect(marker(`hot-${id}`)).toBeOnTheScreen());
  });

  describe('la mia serata', () => {
    const ownSpot = {
      venueId: 'mine',
      name: 'Arena Club',
      intent: 'going' as const,
      lat: 45.47,
      lng: 9.2,
    };
    const noLayers = { hotSpots: [], spots: [] };

    const me = { userId: 'u-me', handle: 'lince.rosso' };

    it('segna il locale dichiarato col mio volto (anello "Ci vado"), anche fuori dai punti caldi', async () => {
      await render(<MapCanvas {...baseProps} layers={noLayers} ownSpot={ownSpot} me={me} />);
      expect(marker('own').props.coordinate).toEqual({ latitude: 45.47, longitude: 9.2 });
      expect(screen.getByLabelText('map:own.marker.going')).toBeOnTheScreen();
      expect(screen.getByText('L', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(screen.queryByText('map:own.going', { includeHiddenElements: true })).toBeNull();
    });

    it('con "Forse" l’anello è ciano', async () => {
      await render(
        <MapCanvas
          {...baseProps}
          layers={noLayers}
          ownSpot={{ ...ownSpot, intent: 'maybe' }}
          me={me}
        />,
      );
      expect(screen.getByLabelText('map:own.marker.maybe')).toBeOnTheScreen();
    });

    it('nella vista amici il mio volto è un marker a parte: i volti degli amici restano quelli del locale', async () => {
      await render(
        <MapCanvas
          {...baseProps}
          view="friends"
          me={me}
          ownSpot={ownSpot}
          layers={{
            hotSpots: [
              venue({
                venueId: 'mine',
                friendsCount: 1,
                friendsGoing: ['volpe.viola'],
                friendIds: ['u-volpe'],
              }),
            ],

            spots: [],
          }}
        />,
      );
      expect(screen.getAllByTestId('friend-faces', { includeHiddenElements: true })).toHaveLength(
        1,
      );
      expect(screen.queryByText('L', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(screen.getAllByText('V', { includeHiddenElements: true })).toHaveLength(1);
    });

    it('è disegnato anche nella vista amici', async () => {
      await render(
        <MapCanvas {...baseProps} view="friends" layers={noLayers} ownSpot={ownSpot} me={me} />,
      );
      expect(marker('own')).toBeOnTheScreen();
    });

    it('sta sopra i punti caldi e sotto il "Tu"', async () => {
      await render(
        <MapCanvas
          {...baseProps}
          you={{ lat: 45.4625, lng: 9.1925 }}
          layers={{ hotSpots: [venue({ venueId: 'mine' })], spots: [] }}
          ownSpot={ownSpot}
          me={me}
        />,
      );
      const z = (id: string) => Number(marker(id).props.zIndex);
      expect(z('hot-mine')).toBeLessThan(z('own'));
      expect(z('own')).toBeLessThan(z('you'));
    });

    it('un tap apre il locale', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          onOpenVenue={onOpenVenue}
          layers={noLayers}
          ownSpot={ownSpot}
          me={me}
        />,
      );
      await fireEvent.press(tap('own'));
      expect(onOpenVenue).toHaveBeenCalledWith('mine');
    });

    it('senza dichiarazione non c\'è nessun marker "mia serata"', async () => {
      await render(<MapCanvas {...baseProps} layers={noLayers} ownSpot={null} />);
      expect(screen.queryByTestId('marker-own', { includeHiddenElements: true })).toBeNull();
    });
  });

  it('nella vista generale il punto caldo mostra la fascia dei "Ci vado"', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        layers={{
          hotSpots: [venue({ venueId: 'hot', goingBand: '10–20' })],

          spots: [],
        }}
      />,
    );
    expect(screen.getByText('10–20', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('nella vista amici il punto caldo mostra il numero di amici, non la fascia', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        view="friends"
        layers={{
          hotSpots: [venue({ venueId: 'hot', goingBand: '10–20', friendsCount: 2 })],

          spots: [],
        }}
      />,
    );
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('10–20', { includeHiddenElements: true })).toBeNull();
  });

  describe('bitmap dei marker', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const settle = () => act(async () => jest.advanceTimersByTime(250));
    const tracks = (id: string) => marker(id).props.tracksViewChanges;

    it('nella vista amici un friendsCount diverso riattiva il tracking', async () => {
      const spot = (friendsCount: number) => ({
        hotSpots: [venue({ venueId: 'hot', friendsCount })],

        spots: [],
      });
      const { rerender } = await render(
        <MapCanvas {...baseProps} view="friends" layers={spot(1)} />,
      );
      await settle();
      expect(tracks('hot-hot')).toBe(false);
      await rerender(<MapCanvas {...baseProps} view="friends" layers={spot(2)} />);
      expect(tracks('hot-hot')).toBe(true);
      await settle();
      expect(tracks('hot-hot')).toBe(false);
    });

    describe('la mia foto', () => {
      const own = {
        venueId: 'mine',
        name: 'Arena',
        intent: 'going' as const,
        lat: 45.47,
        lng: 9.2,
      };
      const me = { userId: 'u-me', handle: 'lince.rosso' };
      const renderOwn = () =>
        render(
          <MapCanvas
            {...baseProps}
            layers={{ hotSpots: [], spots: [] }}
            ownSpot={own}
            me={me}
            avatarUrls={{ 'u-me': 'https://signed.test/me' }}
          />,
        );

      it('resta in tracking finché la mia foto non è caricata, poi si ferma', async () => {
        await renderOwn();
        await settle();
        expect(tracks('own')).toBe(true);
        await fireEvent(
          screen.getByTestId('avatar-image', { includeHiddenElements: true }),
          'load',
          {
            nativeEvent: {},
          },
        );
        await settle();
        expect(tracks('own')).toBe(false);
      });

      it('dopo 3 secondi smette comunque di tracciare', async () => {
        await renderOwn();
        await act(async () => jest.advanceTimersByTime(3300));
        await settle();
        expect(tracks('own')).toBe(false);
      });
    });

    describe('foto degli amici', () => {
      const friendsLayers = () => ({
        hotSpots: [
          venue({
            venueId: 'hot',
            friendsCount: 2,
            friendsGoing: ['volpe.viola', 'orso.grigio'],
            friendIds: ['u-volpe', 'u-orso'],
          }),
        ],

        spots: [],
      });
      const urls = { 'u-volpe': 'https://signed.test/v', 'u-orso': 'https://signed.test/o' };
      const renderFriends = () =>
        render(
          <MapCanvas {...baseProps} view="friends" layers={friendsLayers()} avatarUrls={urls} />,
        );
      const photo = (index: number) =>
        screen.getAllByTestId('avatar-image', { includeHiddenElements: true })[index]!;

      it('resta in tracking finché tutte le foto non sono caricate, poi si ferma', async () => {
        await renderFriends();
        await settle();
        expect(tracks('hot-hot')).toBe(true);
        await fireEvent(photo(0), 'load', { nativeEvent: {} });
        await settle();
        expect(tracks('hot-hot')).toBe(true);
        await fireEvent(photo(1), 'load', { nativeEvent: {} });
        expect(tracks('hot-hot')).toBe(true);
        await settle();
        expect(tracks('hot-hot')).toBe(false);
      });

      it('una foto che non si carica (onError) lascia l’iniziale e ferma il tracking', async () => {
        await renderFriends();
        await fireEvent(photo(0), 'load', { nativeEvent: {} });
        await fireEvent(photo(1), 'error', { nativeEvent: { error: 'x' } });
        await settle();
        expect(tracks('hot-hot')).toBe(false);
        expect(screen.getByText('O', { includeHiddenElements: true })).toBeOnTheScreen();
      });

      it('dopo 3 secondi smette comunque di tracciare (la rete può non rispondere mai)', async () => {
        await renderFriends();
        await act(async () => jest.advanceTimersByTime(2900));
        expect(tracks('hot-hot')).toBe(true);
        await act(async () => jest.advanceTimersByTime(300));
        await settle();
        expect(tracks('hot-hot')).toBe(false);
      });

      it('senza foto firmate (nessun legame) non aspetta nulla: iniziale e bitmap ferma', async () => {
        await render(
          <MapCanvas {...baseProps} view="friends" layers={friendsLayers()} avatarUrls={{}} />,
        );
        await settle();
        expect(tracks('hot-hot')).toBe(false);
      });
    });

    it('con dati identici resta fermo', async () => {
      const layers = () => ({ hotSpots: [venue({ venueId: 'hot' })], spots: [] });
      const { rerender } = await render(<MapCanvas {...baseProps} layers={layers()} />);
      await settle();
      await rerender(<MapCanvas {...baseProps} layers={layers()} />);
      expect(tracks('hot-hot')).toBe(false);
    });
  });

  describe('regione', () => {
    const region = { latitude: 45.5, longitude: 9.2, latitudeDelta: 0.01, longitudeDelta: 0.02 };

    it('parte dalla regione ricevuta, se c’è, invece che dal centro città', async () => {
      await render(
        <MapCanvas {...baseProps} initialRegion={region} layers={{ hotSpots: [], spots: [] }} />,
      );
      expect(screen.getByTestId('map-view').props.initialRegion).toEqual(region);
    });

    it('comunica la regione quando l’utente finisce di spostare la mappa', async () => {
      const onRegionChange = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          onRegionChange={onRegionChange}
          layers={{ hotSpots: [], spots: [] }}
        />,
      );
      await fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', region);
      expect(onRegionChange).toHaveBeenCalledWith(region);
    });
  });

  describe('serate dei creator', () => {
    const placement = (eventId: string, lat = 45.47, lng = 9.2) => ({
      lat,
      lng,
      event: {
        eventId,
        name: `Serata ${eventId}`,
        venueId: 'v1',
        venueName: 'Arena Club',
        venueKind: 'club' as const,
        lat: 45.46,
        lng: 9.19,
        startsAt: '2026-11-06T21:00:00Z',
        endsAt: '2026-11-07T03:00:00Z',
        goingBand: '3–10' as const,
        maybeBand: 'pochi' as const,
        isSponsored: false,
        timezone: 'Europe/Rome',
      },
    });

    it('le disegna dove le ha collocate il dominio, sopra i punti grigi e sotto i punti caldi', async () => {
      await render(
        <MapCanvas
          {...baseProps}
          layers={{
            hotSpots: [venue({ venueId: 'hot' })],
            spots: [],
          }}
          events={[placement('e1')]}
          onOpenEvent={jest.fn()}
        />,
      );
      expect(marker('event-e1').props.coordinate).toEqual({ latitude: 45.47, longitude: 9.2 });
      const z = (id: string) => Number(marker(id).props.zIndex);
      expect(z('event-e1')).toBeLessThan(z('hot-hot'));
    });

    it('il tap apre la serata, non il locale', async () => {
      const onOpenEvent = jest.fn();
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [], spots: [] }}
          events={[placement('e1')]}
          onOpenEvent={onOpenEvent}
        />,
      );
      await fireEvent.press(tap('event-e1'));
      expect(onOpenEvent).toHaveBeenCalledWith('e1');
      expect(onOpenVenue).not.toHaveBeenCalled();
    });

    it('senza serate non disegna nulla in più', async () => {
      await render(<MapCanvas {...baseProps} layers={{ hotSpots: [], spots: [] }} />);
      expect(screen.queryByTestId(/^marker-event-/, { includeHiddenElements: true })).toBeNull();
    });
  });

  describe('spot dichiarabili', () => {
    const spot = (venueId: string): MapVenue => ({
      ...venue({ venueId }),
      kind: 'spot',
      isSpot: true,
      isHotSpot: false,
      goingBand: null,
      maybeBand: null,
    });

    it('disegna uno SpotMarker per ogni spot, sotto i punti caldi', async () => {
      await render(
        <MapCanvas
          {...baseProps}
          layers={{
            hotSpots: [venue({ venueId: 'hot' })],
            spots: [spot('s1'), spot('s2')],
          }}
        />,
      );
      expect(screen.getAllByTestId('spot-marker', { includeHiddenElements: true })).toHaveLength(2);
      const z = (id: string) => Number(marker(id).props.zIndex);
      expect(z('spot-s1')).toBeLessThan(z('hot-hot'));
    });

    it('un tap sullo spot apre la sua scheda', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [], spots: [spot('s1')] }}
        />,
      );
      await fireEvent.press(tap('spot-s1'));
      expect(onOpenVenue).toHaveBeenLastCalledWith('s1');
    });

    it('lo spot non porta numeri né fasce', async () => {
      await render(<MapCanvas {...baseProps} layers={{ hotSpots: [], spots: [spot('s1')] }} />);
      expect(screen.queryByText(/pochi|3–10/)).toBeNull();
    });

    it('nella mappa amici lo spot mostra il numero di amici', async () => {
      await render(
        <MapCanvas
          {...baseProps}
          view="friends"
          layers={{
            hotSpots: [],
            spots: [{ ...spot('s1'), friendsCount: 2, friendsGoing: ['a.b', 'c.d'] }],
          }}
        />,
      );
      expect(screen.getByText('2')).toBeOnTheScreen();
    });
  });
});

describe('MapCanvas: pressione lunga per uno spot', () => {
  const touch = (pageX: number, pageY: number) => ({
    nativeEvent: { pageX, pageY, touches: [{}] },
  });
  const noLayers = { hotSpots: [], spots: [] };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('senza onPickSpot la mappa non ascolta nessuna pressione', async () => {
    await render(<MapCanvas {...baseProps} layers={noLayers} />);
    expect(screen.queryByTestId('map-press-surface')).toBeNull();
  });

  it('con onPickSpot, 3 secondi di pressione e il rilascio danno la coordinata del punto', async () => {
    const onPickSpot = jest.fn();
    await render(<MapCanvas {...baseProps} layers={noLayers} onPickSpot={onPickSpot} />);
    const surface = screen.getByTestId('map-press-surface');
    await act(async () => fireEvent(surface, 'touchStart', touch(200, 300)));
    expect(screen.getByTestId('spot-press-ring')).toBeOnTheScreen();
    await act(async () => void jest.advanceTimersByTime(3100));
    expect(onPickSpot).not.toHaveBeenCalled();
    await act(async () => fireEvent(surface, 'touchEnd'));
    expect(onPickSpot).toHaveBeenCalledWith({ lat: 45.3, lng: 9.2 });
  });
});

describe('MapCanvas: vai alla mia posizione', () => {
  const animateToRegion = jest.requireMock<{ __animateToRegion: jest.Mock }>(
    'react-native-maps',
  ).__animateToRegion;
  const noLayers = { hotSpots: [], spots: [] };
  const point = { lat: 45.47, lng: 9.2 };
  beforeEach(() => animateToRegion.mockClear());

  it('anima la mappa sulla cella indicata quando arriva una richiesta', async () => {
    const { rerender } = await render(<MapCanvas {...baseProps} layers={noLayers} />);
    expect(animateToRegion).not.toHaveBeenCalled();
    await rerender(<MapCanvas {...baseProps} layers={noLayers} focus={{ point }} />);
    expect(animateToRegion).toHaveBeenCalledTimes(1);
    expect(animateToRegion.mock.calls[0]?.[0]).toMatchObject({ latitude: 45.47, longitude: 9.2 });
  });

  it('un rerender con la stessa richiesta non ri-anima; una nuova richiesta sì', async () => {
    const first = { point };
    const { rerender } = await render(<MapCanvas {...baseProps} layers={noLayers} focus={first} />);
    await rerender(<MapCanvas {...baseProps} layers={noLayers} focus={first} />);
    expect(animateToRegion).toHaveBeenCalledTimes(1);
    await rerender(<MapCanvas {...baseProps} layers={noLayers} focus={{ point }} />);
    expect(animateToRegion).toHaveBeenCalledTimes(2);
  });
});

describe('MapCanvas: locale evidenziato da "I più animati"', () => {
  const animateToRegion = jest.requireMock<{ __animateToRegion: jest.Mock }>(
    'react-native-maps',
  ).__animateToRegion;
  const noLayers = { hotSpots: [], spots: [] };
  const point = { lat: 45.47, lng: 9.2 };
  beforeEach(() => {
    animateToRegion.mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('inquadra più da vicino quando la richiesta porta un delta', async () => {
    await render(<MapCanvas {...baseProps} layers={noLayers} focus={{ point, delta: 0.008 }} />);
    expect(animateToRegion.mock.calls[0]?.[0]).toMatchObject({
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
    expect(animateToRegion.mock.calls[0]?.[1]).toBeGreaterThan(0);
  });

  it('con animated=false sposta la camera senza animazione', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        layers={noLayers}
        focus={{ point, delta: 0.008, animated: false }}
      />,
    );
    expect(animateToRegion.mock.calls[0]?.[1]).toBe(0);
  });

  it("disegna l'anello sulle coordinate del locale, sopra i punti caldi e sotto il Tu", async () => {
    await render(
      <MapCanvas
        {...baseProps}
        you={{ lat: 45.4625, lng: 9.1925 }}
        layers={{ ...noLayers, hotSpots: [venue({ venueId: 'hot' })] }}
        highlight={{ venueId: 'hot', point, animated: true }}
      />,
    );
    expect(marker('highlight')).toHaveProp('coordinate', { latitude: 45.47, longitude: 9.2 });
    expect(Number(marker('highlight').props.zIndex)).toBeGreaterThan(
      Number(marker('hot-hot').props.zIndex),
    );
    expect(Number(marker('highlight').props.zIndex)).toBeLessThan(
      Number(marker('you').props.zIndex),
    );
  });

  it("senza evidenza non c'è nessun anello", async () => {
    await render(<MapCanvas {...baseProps} layers={noLayers} />);
    expect(screen.queryByTestId('marker-highlight', { includeHiddenElements: true })).toBeNull();
  });

  it("l'anello che pulsa tiene il tracking acceso; quello fermo si congela dopo il primo render", async () => {
    const { rerender } = await render(
      <MapCanvas
        {...baseProps}
        layers={noLayers}
        highlight={{ venueId: 'x', point, animated: true }}
      />,
    );
    await act(async () => void jest.advanceTimersByTime(1000));
    expect(marker('highlight')).toHaveProp('tracksViewChanges', true);
    await rerender(
      <MapCanvas
        {...baseProps}
        layers={noLayers}
        highlight={{ venueId: 'x', point, animated: false }}
      />,
    );
    await act(async () => void jest.advanceTimersByTime(1000));
    expect(marker('highlight')).toHaveProp('tracksViewChanges', false);
  });
});
