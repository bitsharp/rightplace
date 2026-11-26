import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { MapVenue } from './domain/mapLayers';
import { OPEN_DELAY_MS, REDUCED_OPEN_DELAY_MS, useBusiestFocus } from './useBusiestFocus';

const row = (venueId: string, lat: number, lng: number): MapVenue => ({
  venueId,
  name: venueId,
  kind: 'club',
  lat,
  lng,
  typicalLevel: 3,
  goingBand: 'pochi',
  maybeBand: 'pochi',
  isHotSpot: false,
  isSponsored: false,
  friendsGoing: null,
  friendIds: null,
  friendsCount: null,
  isSpot: false,
});

const rows = [row('a', 45.46, 9.19), row('b', 45.5, 9.25)];

async function setup(reduceMotion = false) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  const onOpenVenue = jest.fn();
  const view = await renderHook(() => useBusiestFocus(rows, onOpenVenue));
  return { ...view, onOpenVenue };
}

const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

describe('useBusiestFocus', () => {
  beforeEach(() =>
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }),
  );
  afterEach(() => jest.useRealTimers());

  it('al tap centra la mappa sul locale in modo ravvicinato e lo evidenzia, poi apre il dettaglio', async () => {
    const { result, onOpenVenue } = await setup();
    await act(async () => result.current.select('a'));
    expect(result.current.focus).toMatchObject({
      point: { lat: 45.46, lng: 9.19 },
      animated: true,
    });
    expect(result.current.focus?.delta).toBeLessThan(0.02);
    expect(result.current.highlight).toMatchObject({ venueId: 'a', animated: true });
    expect(onOpenVenue).not.toHaveBeenCalled();
    await advance(OPEN_DELAY_MS - 1);
    expect(onOpenVenue).not.toHaveBeenCalled();
    await advance(1);
    expect(onOpenVenue).toHaveBeenCalledWith('a');
    expect(onOpenVenue).toHaveBeenCalledTimes(1);
  });

  it("spegne l'evidenza all'apertura del dettaglio", async () => {
    const { result } = await setup();
    await act(async () => result.current.select('a'));
    await advance(OPEN_DELAY_MS);
    expect(result.current.highlight).toBeNull();
  });

  it("un secondo tap prima dell'apertura annulla il primo: vince l'ultimo", async () => {
    const { result, onOpenVenue } = await setup();
    await act(async () => result.current.select('a'));
    await advance(400);
    await act(async () => result.current.select('b'));
    expect(result.current.highlight?.venueId).toBe('b');
    expect(result.current.focus?.point).toEqual({ lat: 45.5, lng: 9.25 });
    await advance(OPEN_DELAY_MS);
    expect(onOpenVenue).toHaveBeenCalledTimes(1);
    expect(onOpenVenue).toHaveBeenCalledWith('b');
  });

  it('con "riduci movimento": camera senza animazione, anello fermo, apertura dopo un ritardo breve', async () => {
    const { result, onOpenVenue } = await setup(true);
    await act(async () => void 0);
    await act(async () => result.current.select('a'));
    expect(result.current.focus?.animated).toBe(false);
    expect(result.current.highlight?.animated).toBe(false);
    await advance(REDUCED_OPEN_DELAY_MS);
    expect(onOpenVenue).toHaveBeenCalledWith('a');
  });

  it('senza coordinate per il locale apre subito il dettaglio, senza camera né evidenza', async () => {
    const { result, onOpenVenue } = await setup();
    await act(async () => result.current.select('sconosciuto'));
    expect(onOpenVenue).toHaveBeenCalledWith('sconosciuto');
    expect(result.current.focus).toBeUndefined();
    expect(result.current.highlight).toBeNull();
  });

  it('allo smontaggio pulisce il timer: nessuna apertura', async () => {
    const { result, onOpenVenue, unmount } = await setup();
    await act(async () => result.current.select('a'));
    await unmount();
    await advance(OPEN_DELAY_MS * 2);
    expect(onOpenVenue).not.toHaveBeenCalled();
  });
});
