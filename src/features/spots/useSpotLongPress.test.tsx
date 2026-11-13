import { act, renderHook } from '@testing-library/react-native';
import type { GestureResponderEvent } from 'react-native';

import { useSpotLongPress } from './useSpotLongPress';
import { SPOT_LONG_PRESS_MS } from './domain/longPress';

const touch = (pageX: number, pageY: number, touches = 1) =>
  ({
    nativeEvent: { pageX, pageY, touches: Array.from({ length: touches }, () => ({})) },
  }) as unknown as GestureResponderEvent;

async function setup() {
  const onFire = jest.fn();
  const hook = await renderHook(() => useSpotLongPress(onFire));
  const handlers = () => hook.result.current.handlers;
  return { onFire, hook, handlers };
}

describe('useSpotLongPress', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a riposo non mostra alcun anello', async () => {
    const { hook } = await setup();
    expect(hook.result.current.ring).toBeNull();
  });

  it("mentre si preme l'anello è nel punto del dito e avanza col tempo", async () => {
    const { hook, handlers } = await setup();
    await act(async () => handlers().onTouchStart(touch(100, 200)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS / 2));
    expect(hook.result.current.ring).toMatchObject({ x: 100, y: 200 });
    expect(hook.result.current.ring?.progress).toBeGreaterThan(0.4);
    expect(hook.result.current.ring?.progress).toBeLessThan(0.6);
  });

  it('rilasciare dopo 3 secondi sceglie il punto, e solo al rilascio', async () => {
    const { onFire, hook, handlers } = await setup();
    await act(async () => handlers().onTouchStart(touch(100, 200)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 100));
    expect(onFire).not.toHaveBeenCalled();
    expect(hook.result.current.ring?.progress).toBe(1);
    await act(async () => handlers().onTouchEnd());
    expect(onFire).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(hook.result.current.ring).toBeNull();
  });

  it('rilasciare prima dei 3 secondi non sceglie nulla', async () => {
    const { onFire, handlers } = await setup();
    await act(async () => handlers().onTouchStart(touch(10, 10)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS - 500));
    await act(async () => handlers().onTouchEnd());
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS));
    expect(onFire).not.toHaveBeenCalled();
  });

  it("un trascinamento (pan) annulla e l'anello sparisce", async () => {
    const { onFire, hook, handlers } = await setup();
    await act(async () => handlers().onTouchStart(touch(10, 10)));
    await act(async () => handlers().onTouchMove(touch(80, 10)));
    expect(hook.result.current.ring).toBeNull();
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 100));
    await act(async () => handlers().onTouchEnd());
    expect(onFire).not.toHaveBeenCalled();
  });

  it('un secondo dito (pinch) annulla', async () => {
    const { onFire, hook, handlers } = await setup();
    await act(async () => handlers().onTouchStart(touch(10, 10)));
    await act(async () => handlers().onTouchStart(touch(10, 10, 2)));
    expect(hook.result.current.ring).toBeNull();
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 100));
    await act(async () => handlers().onTouchEnd());
    expect(onFire).not.toHaveBeenCalled();
  });

  it('un tocco annullato dal sistema (cancel) non sceglie nulla', async () => {
    const { onFire, hook, handlers } = await setup();
    await act(async () => handlers().onTouchStart(touch(10, 10)));
    await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 100));
    await act(async () => handlers().onTouchCancel());
    expect(hook.result.current.ring).toBeNull();
    expect(onFire).not.toHaveBeenCalled();
  });

  it('non lascia timer in giro dopo il rilascio', async () => {
    const { handlers } = await setup();
    const started = jest.spyOn(global, 'setInterval');
    const stopped = jest.spyOn(global, 'clearInterval');
    await act(async () => handlers().onTouchStart(touch(10, 10)));
    expect(started).toHaveBeenCalledTimes(1);
    await act(async () => handlers().onTouchEnd());
    expect(stopped).toHaveBeenCalledWith(started.mock.results[0]?.value);
  });
});
