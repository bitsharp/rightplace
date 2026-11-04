import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAP_STORE_KEY, useMapStore } from './mapStore';

describe('mapStore', () => {
  it('parte dalla mappa generale di Milano', () => {
    expect(useMapStore.getState()).toMatchObject({ view: 'general', citySlug: 'milano' });
  });

  it('cambia vista e città', () => {
    useMapStore.getState().setView('friends');
    useMapStore.getState().setCitySlug('las-palmas');
    expect(useMapStore.getState()).toMatchObject({ view: 'friends', citySlug: 'las-palmas' });
  });

  it('ricorda vista e città su disco, ma non le funzioni', async () => {
    useMapStore.getState().setView('friends');
    await new Promise<void>((resolve) => setImmediate(resolve));
    const saved = JSON.parse((await AsyncStorage.getItem(MAP_STORE_KEY)) ?? '{}');
    expect(saved.state).toEqual({ view: 'friends', citySlug: 'milano' });
  });
});
