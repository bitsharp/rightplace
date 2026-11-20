import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAP_STORE_KEY, useMapStore } from './mapStore';

describe('mapStore', () => {
  it('parte dalla mappa generale con la città in automatico', () => {
    expect(useMapStore.getState()).toMatchObject({ view: 'general', cityPreference: 'auto' });
  });

  it('cambia vista e preferenza di città', () => {
    useMapStore.getState().setView('friends');
    useMapStore.getState().setCityPreference('las-palmas');
    expect(useMapStore.getState()).toMatchObject({
      view: 'friends',
      cityPreference: 'las-palmas',
    });
  });

  it('ricorda vista e preferenza su disco, ma non le funzioni', async () => {
    useMapStore.getState().setView('friends');
    await new Promise<void>((resolve) => setImmediate(resolve));
    const saved = JSON.parse((await AsyncStorage.getItem(MAP_STORE_KEY)) ?? '{}');
    expect(saved.state).toEqual({ view: 'friends', cityPreference: 'auto' });
  });

  it('un vecchio citySlug salvato torna in automatico (non era distinguibile da una scelta)', async () => {
    await AsyncStorage.setItem(
      MAP_STORE_KEY,
      JSON.stringify({ state: { view: 'friends', citySlug: 'las-palmas' }, version: 0 }),
    );
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState()).toMatchObject({ view: 'friends', cityPreference: 'auto' });
    expect(useMapStore.getState()).not.toHaveProperty('citySlug');
  });
});
