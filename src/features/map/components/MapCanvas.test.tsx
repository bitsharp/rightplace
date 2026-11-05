import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { MapVenue } from '../domain/mapLayers';

import { MapCanvas } from './MapCanvas';

const venue = (overrides: Partial<MapVenue> & { venueId: string }): MapVenue => ({
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
  friendsCount: null,
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

describe('MapCanvas', () => {
  it('non usa la posizione nativa, né POI né traffico: il "Tu" lo disegniamo noi', async () => {
    await render(<MapCanvas {...baseProps} layers={{ hotSpots: [], typicalDots: [] }} />);
    expect(screen.getByTestId('map-view')).toHaveProp('showsUserLocation', false);
    expect(screen.getByTestId('map-view')).toHaveProp('showsPointsOfInterests', false);
    expect(screen.getByTestId('map-view')).toHaveProp('showsTraffic', false);
    expect(screen.getByTestId('map-view')).toHaveProp('userInterfaceStyle', 'dark');
  });

  it('parte dal centro della città', async () => {
    await render(<MapCanvas {...baseProps} layers={{ hotSpots: [], typicalDots: [] }} />);
    expect(screen.getByTestId('map-view').props.initialRegion).toMatchObject({
      latitude: 45.4642,
      longitude: 9.19,
    });
  });

  it('disegna typical dot sotto i punti caldi e il "Tu" sopra tutti', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        you={{ lat: 45.4625, lng: 9.1925 }}
        layers={{
          hotSpots: [venue({ venueId: 'hot' })],
          typicalDots: [venue({ venueId: 'dot', isHotSpot: false, typicalLevel: 2 })],
        }}
      />,
    );
    const z = (id: string) => Number(marker(id).props.zIndex);
    expect(z('typical-dot')).toBeLessThan(z('hot-hot'));
    expect(z('hot-hot')).toBeLessThan(z('you'));
  });

  it('mette il marker "Tu" solo se c’è una posizione grossolana', async () => {
    const { rerender } = await render(
      <MapCanvas {...baseProps} layers={{ hotSpots: [], typicalDots: [] }} />,
    );
    expect(screen.queryByTestId('marker-you', { includeHiddenElements: true })).toBeNull();
    await rerender(
      <MapCanvas
        {...baseProps}
        you={{ lat: 45.4625, lng: 9.1925 }}
        layers={{ hotSpots: [], typicalDots: [] }}
      />,
    );
    expect(marker('you').props.coordinate).toEqual({ latitude: 45.4625, longitude: 9.1925 });
  });

  it('dopo il primo render i marker non ridisegnano più la loro bitmap', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        layers={{ hotSpots: [venue({ venueId: 'hot' })], typicalDots: [] }}
      />,
    );
    expect(marker('hot-hot')).toHaveProp('tracksViewChanges', true);
    await waitFor(() => expect(marker('hot-hot')).toHaveProp('tracksViewChanges', false));
  });

  it('un tap sul marker del punto caldo o del typical dot apre il locale', async () => {
    const onOpenVenue = jest.fn();
    await render(
      <MapCanvas
        {...baseProps}
        onOpenVenue={onOpenVenue}
        layers={{
          hotSpots: [venue({ venueId: 'hot' })],
          typicalDots: [venue({ venueId: 'dot', isHotSpot: false, typicalLevel: 1 })],
        }}
      />,
    );
    await fireEvent.press(marker('hot-hot'));
    expect(onOpenVenue).toHaveBeenLastCalledWith('hot');
    await fireEvent.press(marker('typical-dot'));
    expect(onOpenVenue).toHaveBeenLastCalledWith('dot');
  });

  it('nella vista generale il punto caldo mostra la fascia dei "Ci vado"', async () => {
    await render(
      <MapCanvas
        {...baseProps}
        layers={{ hotSpots: [venue({ venueId: 'hot', goingBand: '10–20' })], typicalDots: [] }}
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
          typicalDots: [],
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

    it('cambiando il typical_level il marker torna a ridisegnarsi, poi si ferma', async () => {
      const dot = (typicalLevel: 1 | 2) => ({
        hotSpots: [],
        typicalDots: [venue({ venueId: 'dot', isHotSpot: false, typicalLevel })],
      });
      const { rerender } = await render(<MapCanvas {...baseProps} layers={dot(1)} />);
      await settle();
      expect(tracks('typical-dot')).toBe(false);
      await rerender(<MapCanvas {...baseProps} layers={dot(2)} />);
      expect(tracks('typical-dot')).toBe(true);
      await settle();
      expect(tracks('typical-dot')).toBe(false);
    });

    it('nella vista amici un friendsCount diverso riattiva il tracking', async () => {
      const spot = (friendsCount: number) => ({
        hotSpots: [venue({ venueId: 'hot', friendsCount })],
        typicalDots: [],
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

    it('con dati identici resta fermo', async () => {
      const layers = () => ({ hotSpots: [venue({ venueId: 'hot' })], typicalDots: [] });
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
        <MapCanvas
          {...baseProps}
          initialRegion={region}
          layers={{ hotSpots: [], typicalDots: [] }}
        />,
      );
      expect(screen.getByTestId('map-view').props.initialRegion).toEqual(region);
    });

    it('comunica la regione quando l’utente finisce di spostare la mappa', async () => {
      const onRegionChange = jest.fn();
      await render(
        <MapCanvas
          {...baseProps}
          onRegionChange={onRegionChange}
          layers={{ hotSpots: [], typicalDots: [] }}
        />,
      );
      await fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', region);
      expect(onRegionChange).toHaveBeenCalledWith(region);
    });
  });
});
