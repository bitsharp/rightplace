import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAP_STORE_KEY, resetMapStore, useMapStore } from './mapStore';

const save = (state: object, version: number) =>
  AsyncStorage.setItem(MAP_STORE_KEY, JSON.stringify({ state, version }));

describe('mapStore', () => {
  it('parte dalla mappa generale, con la città in automatico', () => {
    expect(useMapStore.getState()).toMatchObject({
      defaultView: 'general',
      view: 'general',
      cityPreference: 'auto',
    });
  });

  it('uno stato salvato con una versione precedente riparte dalla generale, tenendo la città', async () => {
    await save({ view: 'friends', cityPreference: 'las-palmas' }, 2);
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState()).toMatchObject({
      defaultView: 'general',
      view: 'general',
      cityPreference: 'las-palmas',
    });
  });

  it('un vecchio citySlug salvato torna in automatico (non era distinguibile da una scelta)', async () => {
    await save({ view: 'friends', citySlug: 'las-palmas' }, 0);
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState()).toMatchObject({
      defaultView: 'general',
      cityPreference: 'auto',
    });
    expect(useMapStore.getState()).not.toHaveProperty('citySlug');
  });

  it('dalla versione nuova rispetta la preferenza salvata e all’avvio la vista corrente la segue', async () => {
    await save({ defaultView: 'friends', cityPreference: 'auto' }, 3);
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState()).toMatchObject({ defaultView: 'friends', view: 'friends' });
  });

  it('una preferenza salvata non valida torna alla generale', async () => {
    await save({ defaultView: 'boh' }, 3);
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState().defaultView).toBe('general');
  });

  it('il toggle della mappa cambia solo la vista della sessione, non la preferenza', () => {
    useMapStore.getState().setView('friends');
    expect(useMapStore.getState()).toMatchObject({ view: 'friends', defaultView: 'general' });
  });

  it('cambiare la preferenza fa seguire la vista corrente finché la mappa non è stata toccata', () => {
    useMapStore.getState().setDefaultView('friends');
    expect(useMapStore.getState()).toMatchObject({ defaultView: 'friends', view: 'friends' });
  });

  it('dopo un toggle in sessione, cambiare la preferenza non sposta la vista corrente', () => {
    useMapStore.getState().setView('friends');
    useMapStore.getState().setDefaultView('general');
    expect(useMapStore.getState()).toMatchObject({ defaultView: 'general', view: 'friends' });
  });

  it('su disco finiscono preferenza e città, non la vista corrente né le funzioni', async () => {
    useMapStore.getState().setView('friends');
    useMapStore.getState().setDefaultView('friends');
    useMapStore.getState().setCityPreference('las-palmas');
    await new Promise<void>((resolve) => setImmediate(resolve));
    const saved = JSON.parse((await AsyncStorage.getItem(MAP_STORE_KEY)) ?? '{}');
    expect(saved.state).toEqual({ defaultView: 'friends', cityPreference: 'las-palmas' });
  });

  it('resetMapStore riporta tutto ai valori iniziali', () => {
    useMapStore.getState().setDefaultView('friends');
    useMapStore.getState().setView('general');
    resetMapStore();
    expect(useMapStore.getState()).toMatchObject({
      defaultView: 'general',
      view: 'general',
      cityPreference: 'auto',
    });
  });
});
