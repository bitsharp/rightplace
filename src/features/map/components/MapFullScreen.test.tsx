import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { spacing } from '@/theme/tokens';

import type { MapVenue } from '../domain/mapLayers';

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

const hot: MapVenue = {
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
  friendsCount: null,
};

const baseProps = {
  visible: true,
  city: { slug: 'milano', name: 'Milano', lat: 45.4642, lng: 9.19, defaultZoom: 13 },
  layers: { hotSpots: [hot], typicalDots: [] },
  view: 'general' as const,
  you: null,
  initialRegion: undefined,
  onChangeView: jest.fn(),
  onRegionChange: jest.fn(),
  onClose: jest.fn(),
  onOpenVenue: jest.fn(),
};

describe('MapFullScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  });

  it('chiuso non disegna niente', async () => {
    await render(<MapFullScreen {...baseProps} visible={false} />);
    expect(screen.queryByTestId('map-view')).toBeNull();
    expect(screen.queryByText('map:hint.general')).toBeNull();
  });

  it('aperto mostra hint, legenda, selettore di vista, bottone chiudi e la mappa', async () => {
    await render(<MapFullScreen {...baseProps} />);
    expect(screen.getByTestId('map-view')).toBeOnTheScreen();
    expect(screen.getByText('map:hint.general')).toBeOnTheScreen();
    expect(screen.getByText('map:legend.tonight')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'map:view.friends' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'map:fullscreen.close' })).toBeOnTheScreen();
  });

  it('il selettore cambia la vista', async () => {
    await render(<MapFullScreen {...baseProps} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:view.friends' }));
    expect(baseProps.onChangeView).toHaveBeenCalledWith('friends');
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

    const tapMarker = () =>
      fireEvent.press(screen.getByTestId('marker-hot-hot', { includeHiddenElements: true }));

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
      await fireEvent.press(screen.getByTestId('marker-event-e1', { includeHiddenElements: true }));
      expect(calls).toEqual(['close', 'event:e1']);
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
  });

  it('hint e legenda hanno sia left sia right: non escono dallo schermo', async () => {
    await render(<MapFullScreen {...baseProps} />);
    for (const id of ['map-hint-overlay', 'map-legend-overlay']) {
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

    it('l’hint sta nell’area della mappa, sotto la barra, e va a capo su due righe', async () => {
      provideInsets({ top: 47, bottom: 34 });
      await render(<MapFullScreen {...baseProps} />);
      const hint = StyleSheet.flatten(screen.getByTestId('map-hint-overlay').props.style);
      expect(hint.top).toBe(spacing.md);
      expect(screen.getByText('map:hint.general').props.numberOfLines).toBe(2);
      const mapArea = screen.getByTestId('map-fullscreen-map');
      expect(mapArea.children).toContain(screen.getByTestId('map-hint-overlay'));
    });
  });
});
