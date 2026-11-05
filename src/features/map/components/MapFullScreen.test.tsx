import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import type { MapVenue } from '../domain/mapLayers';

import { MapFullScreen } from './MapFullScreen';

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
  beforeEach(() => jest.clearAllMocks());

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
});
