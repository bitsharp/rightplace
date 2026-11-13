import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type MapView from 'react-native-maps';

import { SPOT_LONG_PRESS_MS } from '../domain/longPress';

import { SpotPressSurface } from './SpotPressSurface';

const touch = (pageX: number, pageY: number, touches = 1) => ({
  nativeEvent: { pageX, pageY, touches: Array.from({ length: touches }, () => ({})) },
});

function setup(
  coordinate: { latitude: number; longitude: number } | null = { latitude: 45.5, longitude: 9.2 },
) {
  const coordinateForPoint = jest.fn(async () => coordinate);
  const mapRef = { current: { coordinateForPoint } as unknown as MapView };
  const onPick = jest.fn();
  return { coordinateForPoint, mapRef, onPick };
}

const surface = () => screen.getByTestId('map-press-surface');

describe('SpotPressSurface', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("mostra la mappa (i figli) e, durante la pressione, l'anello", async () => {
    const { mapRef, onPick } = setup();
    await render(
      <SpotPressSurface mapRef={mapRef} onPick={onPick}>
        <Text>mappa</Text>
      </SpotPressSurface>,
    );
    expect(screen.getByText('mappa')).toBeOnTheScreen();
    expect(screen.queryByTestId('spot-press-ring')).toBeNull();
    await act(async () => fireEvent(surface(), 'touchStart', touch(100, 200)));
    expect(screen.getByTestId('spot-press-ring')).toBeOnTheScreen();
  });

  it('dopo 3 secondi e il rilascio chiede alla mappa la coordinata del punto e la passa a onPick', async () => {
    const { coordinateForPoint, mapRef, onPick } = setup();
    await render(
      <SpotPressSurface mapRef={mapRef} onPick={onPick}>
        <Text>mappa</Text>
      </SpotPressSurface>,
    );
    await act(async () => fireEvent(surface(), 'touchStart', touch(100, 200)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 50));
    await act(async () => fireEvent(surface(), 'touchEnd'));
    expect(coordinateForPoint).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(onPick).toHaveBeenCalledWith({ lat: 45.5, lng: 9.2 });
  });

  it('un rilascio anticipato o un pan non chiamano la mappa né onPick', async () => {
    const { coordinateForPoint, mapRef, onPick } = setup();
    await render(
      <SpotPressSurface mapRef={mapRef} onPick={onPick}>
        <Text>mappa</Text>
      </SpotPressSurface>,
    );
    await act(async () => fireEvent(surface(), 'touchStart', touch(100, 200)));
    await act(async () => void jest.advanceTimersByTime(1000));
    await act(async () => fireEvent(surface(), 'touchEnd'));
    await act(async () => fireEvent(surface(), 'touchStart', touch(100, 200)));
    await act(async () => fireEvent(surface(), 'touchMove', touch(200, 200)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 50));
    await act(async () => fireEvent(surface(), 'touchEnd'));
    expect(coordinateForPoint).not.toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('se la mappa non sa risolvere il punto non succede nulla', async () => {
    const { mapRef, onPick } = setup(null);
    await render(
      <SpotPressSurface mapRef={mapRef} onPick={onPick}>
        <Text>mappa</Text>
      </SpotPressSurface>,
    );
    await act(async () => fireEvent(surface(), 'touchStart', touch(1, 1)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 50));
    await act(async () => fireEvent(surface(), 'touchEnd'));
    expect(onPick).not.toHaveBeenCalled();
  });
});
