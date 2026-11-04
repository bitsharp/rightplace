import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { act } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { fakeSupabase } from '@/test/fakeSupabase';

import {
  requestLocationPermission,
  SYNC_INTERVAL_MS,
  syncCoarseLocation,
  useCoarseLocationSync,
  useCoarsePositionStore,
} from './location';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const granted = (value: boolean) => ({ granted: value, status: value ? 'granted' : 'denied' });

describe('requestLocationPermission', () => {
  it('chiede solo il permesso in primo piano e dice se è stato concesso', async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(true) as never);
    await expect(requestLocationPermission()).resolves.toBe(true);
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(false) as never);
    await expect(requestLocationPermission()).resolves.toBe(false);
  });
});

describe('syncCoarseLocation', () => {
  beforeEach(() => useCoarsePositionStore.setState({ cell: null }));

  it('senza permesso non legge né invia la posizione', async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(false) as never);
    await syncCoarseLocation();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(fakeSupabase.rpc).not.toHaveBeenCalled();
  });

  it('invia solo la posizione già arrotondata a ~500 m', async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(true) as never);
    jest
      .mocked(Location.getCurrentPositionAsync)
      .mockResolvedValueOnce({ coords: { latitude: 45.4641, longitude: 9.1901 } } as never);
    await syncCoarseLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('update_coarse_location', {
      p_lat: 45.4625,
      p_lng: 9.1925,
    });
  });
});

describe('posizione grossolana in memoria (marker "Tu")', () => {
  beforeEach(() => useCoarsePositionStore.setState({ cell: null }));

  it('dopo la sync con permesso tiene solo la cella già arrotondata', async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(true) as never);
    jest
      .mocked(Location.getCurrentPositionAsync)
      .mockResolvedValueOnce({ coords: { latitude: 45.4641, longitude: 9.1901 } } as never);
    await syncCoarseLocation();
    expect(useCoarsePositionStore.getState().cell).toEqual({ lat: 45.4625, lng: 9.1925 });
  });

  it('senza permesso non c’è nessuna cella', async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(false) as never);
    await syncCoarseLocation();
    expect(useCoarsePositionStore.getState().cell).toBeNull();
  });

  it('spegnere il toggle posizione cancella la cella', async () => {
    useCoarsePositionStore.setState({ cell: { lat: 45.4625, lng: 9.1925 } });
    await renderHook(() => useCoarseLocationSync(false));
    expect(useCoarsePositionStore.getState().cell).toBeNull();
  });

  it('non viene mai scritta su disco', async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValueOnce(granted(true) as never);
    jest
      .mocked(Location.getCurrentPositionAsync)
      .mockResolvedValueOnce({ coords: { latitude: 45.4641, longitude: 9.1901 } } as never);
    await syncCoarseLocation();
    const keys = await AsyncStorage.getAllKeys();
    const stored = await AsyncStorage.multiGet(keys);
    expect(JSON.stringify(stored)).not.toContain('45.4625');
  });
});

describe('useCoarseLocationSync', () => {
  let appStateHandler: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(granted(true) as never);
    jest
      .mocked(Location.getCurrentPositionAsync)
      .mockResolvedValue({ coords: { latitude: 45.46, longitude: 9.19 } } as never);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandler = handler;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => jest.useRealTimers());

  const syncs = () =>
    fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'update_coarse_location').length;

  it('non fa nulla se la posizione è spenta', async () => {
    await renderHook(() => useCoarseLocationSync(false));
    await act(async () => jest.advanceTimersByTime(SYNC_INTERVAL_MS * 2));
    expect(syncs()).toBe(0);
  });

  it('sincronizza subito e poi ogni 15 minuti mentre l’app è in primo piano', async () => {
    expect(SYNC_INTERVAL_MS).toBe(15 * 60 * 1000);
    await renderHook(() => useCoarseLocationSync(true));
    await act(async () => Promise.resolve());
    expect(syncs()).toBe(1);
    await act(async () => jest.advanceTimersByTime(SYNC_INTERVAL_MS));
    expect(syncs()).toBe(2);
  });

  it('si ferma in background: niente tracciamento fuori dall’app', async () => {
    await renderHook(() => useCoarseLocationSync(true));
    await act(async () => Promise.resolve());
    await act(async () => appStateHandler?.('background'));
    await act(async () => jest.advanceTimersByTime(SYNC_INTERVAL_MS * 3));
    expect(syncs()).toBe(1);
  });
});
