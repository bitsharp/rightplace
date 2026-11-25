import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';

import { cityRegion } from '../domain/region';
import { MapStage } from './MapStage';

const baseProps = {
  city: { slug: 'milano', name: 'Milano', lat: 45.4642, lng: 9.19, defaultZoom: 13 },
  layers: { hotSpots: [], typicalDots: [], spots: [] },
  view: 'general' as const,
  you: null,
  onChangeView: jest.fn(),
  onOpenVenue: jest.fn(),
};

describe('MapStage compatta', () => {
  it('mostra solo la mappa: niente hint né legenda', async () => {
    await render(<MapStage {...baseProps} />);
    expect(screen.getByTestId('map-view')).toBeOnTheScreen();
    expect(screen.queryByText(/map:hint/)).toBeNull();
    expect(screen.queryByText('map:legend.tonight')).toBeNull();
    expect(screen.queryByText('map:legend.usually')).toBeNull();
  });

  it('la mappa compatta ha il velo luminoso', async () => {
    await render(<MapStage {...baseProps} />);
    expect(screen.getByTestId('map-vignette', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('ha un solo bottone, con icona e senza testo visibile, per aprire lo schermo intero', async () => {
    await render(<MapStage {...baseProps} />);
    const open = screen.getByRole('button', { name: 'map:fullscreen.open' });
    expect(open).toBeOnTheScreen();
    expect(screen.queryByText('map:fullscreen.open')).toBeNull();
  });

  it('il bottone apre lo schermo intero con hint e legenda, e "chiudi" lo richiude', async () => {
    await render(<MapStage {...baseProps} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.open' }));
    expect(screen.getByText('map:hint.general')).toBeOnTheScreen();
    expect(screen.getByText('map:legend.tonight')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.close' }));
    expect(screen.queryByText('map:hint.general')).toBeNull();
  });

  it('con lo schermo intero aperto c’è una sola MapView; alla chiusura torna la compatta dove eri', async () => {
    const region = { latitude: 45.5, longitude: 9.2, latitudeDelta: 0.01, longitudeDelta: 0.02 };
    await render(<MapStage {...baseProps} />);
    expect(screen.getAllByTestId('map-view')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.open' }));
    expect(screen.getAllByTestId('map-view')).toHaveLength(1);
    await fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', region);
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.close' }));
    expect(screen.getAllByTestId('map-view')).toHaveLength(1);
    expect(screen.getByTestId('map-view').props.initialRegion).toEqual(region);
  });

  it('la compatta ricorda la regione anche se non è mai stata aperta la schermo intero', async () => {
    const region = { latitude: 45.4, longitude: 9.1, latitudeDelta: 0.02, longitudeDelta: 0.03 };
    await render(<MapStage {...baseProps} />);
    await fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', region);
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.open' }));
    expect(screen.getByTestId('map-view').props.initialRegion).toEqual(region);
  });
  it('quando la città cambia la mappa si ricentra sulla nuova città, anche se avevi spostato la vista', async () => {
    const panned = { latitude: 45.4, longitude: 9.1, latitudeDelta: 0.02, longitudeDelta: 0.03 };
    const lasPalmas = {
      slug: 'las-palmas',
      name: 'Las Palmas',
      lat: 28.1235,
      lng: -15.4134,
      defaultZoom: 13,
    };
    const { rerender } = await render(<MapStage {...baseProps} />);
    await fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', panned);
    await rerender(<MapStage {...baseProps} city={lasPalmas} />);
    expect(screen.getByTestId('map-view').props.initialRegion).toEqual(cityRegion(lasPalmas));
  });

  it('mette il titolo sopra la mappa compatta', async () => {
    await render(<MapStage {...baseProps} header={<Text>intestazione</Text>} />);
    expect(screen.getByText('intestazione')).toBeOnTheScreen();
  });

  it('non c’è più la barra con il nome della città', async () => {
    await render(<MapStage {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'map:searchPlaceholder' })).toBeNull();
  });

  describe('"vai alla mia posizione"', () => {
    const animateToRegion = () =>
      jest.requireMock<{ __animateToRegion: jest.Mock }>('react-native-maps').__animateToRegion;

    beforeEach(() => {
      animateToRegion().mockClear();
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    });
    afterEach(() => jest.restoreAllMocks());

    it('con la posizione attiva centra la mappa sulla cella grossolana', async () => {
      await render(<MapStage {...baseProps} you={{ lat: 45.47, lng: 9.2 }} />);
      await fireEvent.press(screen.getByRole('button', { name: 'map:locate' }));
      expect(animateToRegion().mock.calls[0]?.[0]).toMatchObject({
        latitude: 45.47,
        longitude: 9.2,
      });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('con la posizione spenta avvisa e offre di attivarla, senza muovere la mappa', async () => {
      const onEnableLocation = jest.fn();
      await render(<MapStage {...baseProps} onEnableLocation={onEnableLocation} />);
      await fireEvent.press(screen.getByRole('button', { name: 'map:locate' }));
      expect(animateToRegion()).not.toHaveBeenCalled();
      const [title, body, buttons] = jest.mocked(Alert.alert).mock.calls[0] ?? [];
      expect(title).toBe('map:locateOff.title');
      expect(body).toBe('map:locateOff.body');
      const enable = buttons?.find((button) => button.text === 'map:locateOff.enable');
      enable?.onPress?.();
      expect(onEnableLocation).toHaveBeenCalledTimes(1);
    });
  });
});
