import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { updateCoarseLocation } from './api';
import { coarsen, type LatLng } from './domain/coarsen';

export const SYNC_INTERVAL_MS = 15 * 60 * 1000;

// Last coarse cell, in memory only (never persisted): it feeds the "Tu" marker, so the map shows
// exactly what the server knows. Cleared as soon as the location toggle is off.
export const useCoarsePositionStore = create<{ cell: LatLng | null }>()(() => ({ cell: null }));

const clearCoarsePosition = () => useCoarsePositionStore.setState({ cell: null });

// Principle 3: only the "when in use" permission is ever requested.
export async function requestLocationPermission(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

// Coarsened on the device *and* again on the server: the exact position never leaves the phone.
export async function syncCoarseLocation(): Promise<void> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  if (!granted) return;
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const cell = coarsen({ lat: coords.latitude, lng: coords.longitude });
  useCoarsePositionStore.setState({ cell });
  await updateCoarseLocation(cell.lat, cell.lng);
}

function syncSafely(): void {
  syncCoarseLocation().catch((error: unknown) => console.warn('Posizione non aggiornata', error));
}

// Foreground only: the timer stops as soon as the app leaves the screen (no background tracking).
export function useCoarseLocationSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      clearCoarsePosition();
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      syncSafely();
      timer = setInterval(syncSafely, SYNC_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const subscription = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    );
    return () => {
      stop();
      subscription.remove();
    };
  }, [enabled]);
}
