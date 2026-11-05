import { fireEvent, render, screen } from '@testing-library/react-native';

import { MapStage } from './MapStage';

const baseProps = {
  city: { slug: 'milano', name: 'Milano', lat: 45.4642, lng: 9.19, defaultZoom: 13 },
  layers: { hotSpots: [], typicalDots: [] },
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
});
