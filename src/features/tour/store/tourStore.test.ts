import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateTourState, resetTourStore, TOUR_STORE_KEY, useTourStore } from './tourStore';

describe('tourStore', () => {
  beforeEach(() => resetTourStore());

  it('parte da “niente visto”', () => {
    expect(useTourStore.getState()).toMatchObject({ welcomeSeen: false, seenSteps: [] });
  });

  it('ricorda il benvenuto e i fumetti visti, senza duplicati', () => {
    const { markWelcomeSeen, markStepSeen } = useTourStore.getState();
    markWelcomeSeen();
    markStepSeen('map.hotSpot');
    markStepSeen('map.hotSpot');
    expect(useTourStore.getState()).toMatchObject({
      welcomeSeen: true,
      seenSteps: ['map.hotSpot'],
    });
  });

  it('resetTour riporta tutto a non visto', () => {
    useTourStore.getState().markWelcomeSeen();
    useTourStore.getState().markStepSeen('venue.declare');
    useTourStore.getState().resetTour();
    expect(useTourStore.getState()).toMatchObject({ welcomeSeen: false, seenSteps: [] });
  });

  it('persiste solo i dati della guida sul telefono', async () => {
    useTourStore.getState().markStepSeen('chat.night');
    await Promise.resolve();
    const saved = JSON.parse((await AsyncStorage.getItem(TOUR_STORE_KEY)) ?? '{}') as {
      state: Record<string, unknown>;
      version: number;
    };
    expect(saved.version).toBe(1);
    expect(Object.keys(saved.state).sort()).toEqual(['seenSteps', 'welcomeSeen']);
    expect(saved.state.seenSteps).toEqual(['chat.night']);
  });

  describe('migrateTourState', () => {
    it('tiene i valori validi', () => {
      expect(migrateTourState({ welcomeSeen: true, seenSteps: ['map.hotSpot'] })).toEqual({
        welcomeSeen: true,
        seenSteps: ['map.hotSpot'],
      });
    });

    it('torna ai default con un valore non valido e scarta gli id sconosciuti', () => {
      expect(migrateTourState('boh')).toEqual({ welcomeSeen: false, seenSteps: [] });
      expect(migrateTourState({ welcomeSeen: 'sì', seenSteps: 3 })).toEqual({
        welcomeSeen: false,
        seenSteps: [],
      });
      expect(
        migrateTourState({ welcomeSeen: true, seenSteps: ['map.hotSpot', 'vecchio'] }),
      ).toEqual({
        welcomeSeen: true,
        seenSteps: ['map.hotSpot'],
      });
    });
  });
});
