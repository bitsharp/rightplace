import { createAnchorRegistry } from './anchorRegistry';

const RECT = { x: 10, y: 20, width: 100, height: 40 };

describe('anchorRegistry', () => {
  it('non conosce un’ancora finché non è stata misurata', () => {
    const registry = createAnchorRegistry();
    registry.register('map.hotSpot', {}, jest.fn());
    expect(registry.rectOf('map.hotSpot')).toBeNull();
  });

  it('restituisce il rettangolo misurato e avvisa chi ascolta', () => {
    const registry = createAnchorRegistry();
    const listener = jest.fn();
    registry.subscribe(listener);
    const token = {};
    registry.register('map.hotSpot', token, jest.fn());
    registry.setRect('map.hotSpot', token, RECT);
    expect(registry.rectOf('map.hotSpot')).toEqual(RECT);
    expect(listener).toHaveBeenCalled();
  });

  it('un rettangolo vuoto conta come ancora assente', () => {
    const registry = createAnchorRegistry();
    const token = {};
    registry.register('map.hotSpot', token, jest.fn());
    registry.setRect('map.hotSpot', token, { ...RECT, width: 0 });
    expect(registry.rectOf('map.hotSpot')).toBeNull();
  });

  it('togliendo l’ancora (smontaggio) sparisce, senza toccare le altre con lo stesso id', () => {
    const registry = createAnchorRegistry();
    const first = {};
    const second = {};
    const unregisterFirst = registry.register('topbar.plus', first, jest.fn());
    registry.register('topbar.plus', second, jest.fn());
    registry.setRect('topbar.plus', first, RECT);
    registry.setRect('topbar.plus', second, { ...RECT, x: 11 });
    unregisterFirst();
    expect(registry.rectOf('topbar.plus')).toEqual({ ...RECT, x: 11 });
  });

  it('remeasure chiede una nuova misura alle ancore di quell’id', () => {
    const registry = createAnchorRegistry();
    const measure = jest.fn();
    registry.register('venue.bands', {}, measure);
    registry.remeasure('venue.bands');
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it('la versione cambia a ogni modifica, per useSyncExternalStore', () => {
    const registry = createAnchorRegistry();
    const before = registry.version();
    const token = {};
    registry.register('chat.night', token, jest.fn());
    registry.setRect('chat.night', token, RECT);
    expect(registry.version()).toBeGreaterThan(before);
  });
});
