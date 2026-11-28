import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { spacing } from '@/theme/tokens';

import type { HotSpotVenue } from '../domain/mapLayers';

import { MapFullScreen } from './MapFullScreen';

// The Modal is a separate native root: only a provider inside it knows the real insets, so the
// test provider both records that it is used and supplies the insets of an iPhone with a notch.
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
const mockProvider = jest.fn();
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context/jest/mock').default;
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: unknown }) => {
      mockProvider();
      return createElement(actual.SafeAreaInsetsContext.Provider, { value: mockInsets }, children);
    },
  };
});

const hot: HotSpotVenue = {
  venueId: 'hot',
  name: 'Arena Club',
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
};

const baseProps = {
  visible: true,
  city: { slug: 'milano', name: 'Milano', lat: 45.4642, lng: 9.19, defaultZoom: 13 },
  layers: { hotSpots: [hot], spots: [] },
  view: 'general' as const,
  you: null,
  initialRegion: undefined,
  onChangeView: jest.fn(),
  onRegionChange: jest.fn(),
  onClose: jest.fn(),
  onOpenVenue: jest.fn(),
  onOpenSearch: jest.fn(),
  onLocate: jest.fn(),
};

describe('MapFullScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  });

  it('a schermo intero la mia serata resta segnata sulla mappa', async () => {
    const ownSpot = {
      venueId: 'mine',
      name: 'Arena Club',
      intent: 'going' as const,
      lat: 45.47,
      lng: 9.2,
    };
    await render(
      <MapFullScreen
        {...baseProps}
        ownSpot={ownSpot}
        me={{ userId: 'u-me', handle: 'lince.rosso' }}
      />,
    );
    expect(screen.getByTestId('marker-own', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('chiuso non disegna niente', async () => {
    await render(<MapFullScreen {...baseProps} visible={false} />);
    expect(screen.queryByTestId('map-view')).toBeNull();
    expect(screen.queryByText('map:legend.tonight')).toBeNull();
  });

  it('aperto mostra la legenda, selettore di vista, bottone chiudi e la mappa', async () => {
    await render(<MapFullScreen {...baseProps} />);
    expect(screen.getByTestId('map-view')).toBeOnTheScreen();
    expect(screen.queryByText(/map:hint/)).toBeNull();
    expect(screen.queryByTestId('map-hint-overlay')).toBeNull();
    expect(screen.getByText('map:legend.tonight')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'map:view.friends' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'map:fullscreen.close' })).toBeOnTheScreen();
  });

  it('a schermo intero la mappa ha il velo, che non copre la legenda (resta sopra, senza tocchi)', async () => {
    await render(<MapFullScreen {...baseProps} />);
    expect(screen.getByTestId('map-vignette', { includeHiddenElements: true })).toBeOnTheScreen();
    const map = screen.getByTestId('map-fullscreen-map');
    const order = (id: string) =>
      map.children.findIndex(
        (child) => (child as { props?: { testID?: string } }).props?.testID === id,
      );
    expect(order('map-legend-overlay')).toBeGreaterThan(-1);
  });

  it('il selettore cambia la vista', async () => {
    await render(<MapFullScreen {...baseProps} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:view.friends' }));
    expect(baseProps.onChangeView).toHaveBeenCalledWith('friends');
  });

  it('ha la stessa colonna di tre bottoni della home e niente X in alto', async () => {
    await render(<MapFullScreen {...baseProps} />);
    expect(screen.getByTestId('map-controls')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'map:header.filters' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'map:locate' })).toBeOnTheScreen();
    expect(screen.getByTestId('icon-collapse', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId('icon-close', { includeHiddenElements: true })).toBeNull();
  });

  it('la posizione resta a schermo intero e chiama onLocate', async () => {
    await render(<MapFullScreen {...baseProps} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:locate' }));
    expect(baseProps.onLocate).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('la ricerca chiude lo schermo intero e poi si apre (Android: subito)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const calls: string[] = [];
    await render(
      <MapFullScreen
        {...baseProps}
        onClose={() => calls.push('close')}
        onOpenSearch={() => calls.push('search')}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'map:header.filters' }));
    expect(calls).toEqual(['close', 'search']);
    jest.restoreAllMocks();
  });

  it('su iOS la ricerca si apre solo a onDismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const calls: string[] = [];
    await render(
      <MapFullScreen
        {...baseProps}
        onClose={() => calls.push('close')}
        onOpenSearch={() => calls.push('search')}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'map:header.filters' }));
    expect(calls).toEqual(['close']);
    await fireEvent(screen.getByTestId('map-fullscreen'), 'dismiss');
    expect(calls).toEqual(['close', 'search']);
    jest.restoreAllMocks();
  });

  it('il bottone chiudi e il tasto indietro di Android chiudono', async () => {
    await render(<MapFullScreen {...baseProps} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.close' }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    await fireEvent(screen.getByTestId('map-fullscreen'), 'requestClose');
    expect(baseProps.onClose).toHaveBeenCalledTimes(2);
  });

  describe('tap su un marker', () => {
    afterEach(() => jest.restoreAllMocks());

    // iOS taps the Pressable around the marker, Android the Marker itself.
    const tapId = (id: string) => (Platform.OS === 'ios' ? `tap-marker-${id}` : `marker-${id}`);
    const tapById = (id: string) =>
      fireEvent.press(screen.getByTestId(tapId(id), { includeHiddenElements: true }));
    const tapMarker = () => tapById('hot-hot');

    it('su Android chiude la mappa e apre subito il locale', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const calls: string[] = [];
      await render(
        <MapFullScreen
          {...baseProps}
          onClose={() => calls.push('close')}
          onOpenVenue={(id) => calls.push(`open:${id}`)}
        />,
      );
      await tapMarker();
      expect(calls).toEqual(['close', 'open:hot']);
    });

    it('anche una serata si apre dopo aver chiuso la mappa a schermo intero', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const calls: string[] = [];
      await render(
        <MapFullScreen
          {...baseProps}
          onClose={() => calls.push('close')}
          onOpenVenue={(id) => calls.push(`venue:${id}`)}
          onOpenEvent={(id) => calls.push(`event:${id}`)}
          events={[
            {
              lat: 45.47,
              lng: 9.2,
              event: {
                eventId: 'e1',
                name: 'Notte Techno',
                venueId: 'hot',
                venueName: 'Arena Club',
                venueKind: 'club',
                lat: 45.46,
                lng: 9.19,
                startsAt: '2026-11-06T21:00:00Z',
                endsAt: '2026-11-07T03:00:00Z',
                goingBand: '3–10',
                maybeBand: 'pochi',
                isSponsored: false,
                timezone: 'Europe/Rome',
              },
            },
          ]}
        />,
      );
      await tapById('event-e1');
      expect(calls).toEqual(['close', 'event:e1']);
    });

    it('nella vista amici un marker con volti chiude la mappa e poi apre il locale', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const calls: string[] = [];
      await render(
        <MapFullScreen
          {...baseProps}
          view="friends"
          layers={{
            hotSpots: [{ ...hot, friendsGoing: ['a.a'], friendIds: ['ua'], friendsCount: 1 }],
            spots: [],
          }}
          onClose={() => calls.push('close')}
          onOpenVenue={(id) => calls.push(`venue:${id}`)}
        />,
      );
      await tapMarker();
      expect(calls).toEqual(['close', 'venue:hot']);
    });

    it('su iOS chiude subito ma apre il locale solo a onDismiss, una volta', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      const calls: string[] = [];
      await render(
        <MapFullScreen
          {...baseProps}
          onClose={() => calls.push('close')}
          onOpenVenue={(id) => calls.push(`open:${id}`)}
        />,
      );
      await tapMarker();
      expect(calls).toEqual(['close']);
      await fireEvent(screen.getByTestId('map-fullscreen'), 'dismiss');
      await fireEvent(screen.getByTestId('map-fullscreen'), 'dismiss');
      expect(calls).toEqual(['close', 'open:hot']);
    });

    it('su iOS il locale si apre anche se il genitore ricrea le callback prima di onDismiss', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      const calls: string[] = [];
      const first = (id: string) => calls.push(`old:${id}`);
      const latest = (id: string) => calls.push(`new:${id}`);
      const onClose = () => calls.push('close');
      const { rerender } = await render(
        <MapFullScreen {...baseProps} onClose={onClose} onOpenVenue={first} />,
      );
      await tapMarker();
      await rerender(<MapFullScreen {...baseProps} onClose={onClose} onOpenVenue={latest} />);
      await fireEvent(screen.getByTestId('map-fullscreen'), 'dismiss');
      expect(calls).toEqual(['close', 'new:hot']);
    });
  });

  describe('pressione lunga per uno spot', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    async function pressLongOnMap() {
      jest.useFakeTimers();
      const surface = screen.getByTestId('map-press-surface');
      const touch = { nativeEvent: { pageX: 200, pageY: 300, touches: [{}] } };
      await act(async () => fireEvent(surface, 'touchStart', touch));
      await act(async () => void jest.advanceTimersByTime(3100));
      await act(async () => fireEvent(surface, 'touchEnd'));
    }

    it('a schermo intero chiude la mappa e poi passa il punto (Android: subito)', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const calls: string[] = [];
      await render(
        <MapFullScreen
          {...baseProps}
          onClose={() => calls.push('close')}
          onPickSpot={(point) => calls.push(`spot:${point.lat},${point.lng}`)}
        />,
      );
      await pressLongOnMap();
      expect(calls).toEqual(['close', 'spot:45.3,9.2']);
    });

    it('su iOS apre lo sheet solo quando il Modal è sparito, una volta', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      const calls: string[] = [];
      await render(
        <MapFullScreen
          {...baseProps}
          onClose={() => calls.push('close')}
          onPickSpot={(point) => calls.push(`spot:${point.lat}`)}
        />,
      );
      await pressLongOnMap();
      expect(calls).toEqual(['close']);
      await fireEvent(screen.getByTestId('map-fullscreen'), 'dismiss');
      await fireEvent(screen.getByTestId('map-fullscreen'), 'dismiss');
      expect(calls).toEqual(['close', 'spot:45.3']);
    });

    it('senza onPickSpot la mappa a schermo intero non ascolta la pressione', async () => {
      await render(<MapFullScreen {...baseProps} />);
      expect(screen.queryByTestId('map-press-surface')).toBeNull();
    });
  });

  it('la legenda ha sia left sia right: non esce dallo schermo', async () => {
    await render(<MapFullScreen {...baseProps} />);
    for (const id of ['map-legend-overlay']) {
      const style = StyleSheet.flatten(screen.getByTestId(id).props.style);
      expect(typeof style.left).toBe('number');
      expect(typeof style.right).toBe('number');
    }
  });

  describe('safe area dentro il Modal', () => {
    afterEach(() => jest.restoreAllMocks());

    const provideInsets = (insets: { top: number; bottom: number }) => {
      mockInsets = { left: 0, right: 0, ...insets };
    };

    afterEach(() => {
      mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    });

    it('il contenuto è dentro un SafeAreaProvider', async () => {
      await render(<MapFullScreen {...baseProps} />);
      expect(mockProvider).toHaveBeenCalled();
    });

    it('la barra in alto sta sotto la status bar: padding top = inset + spacing', async () => {
      provideInsets({ top: 47, bottom: 34 });
      await render(<MapFullScreen {...baseProps} />);
      const bar = StyleSheet.flatten(screen.getByTestId('map-fullscreen-bar').props.style);
      expect(bar.paddingTop).toBe(47 + spacing.sm);
    });

    it('la legenda sta sopra la safe area inferiore', async () => {
      provideInsets({ top: 47, bottom: 34 });
      await render(<MapFullScreen {...baseProps} />);
      const legend = StyleSheet.flatten(screen.getByTestId('map-legend-overlay').props.style);
      expect(legend.bottom).toBe(spacing.md + 34);
    });
  });
});
