import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

import { endActiveUsageSession } from './activeTracker';
import { useUsageTracking } from './useUsageTracking';

const calls = (name: string) => fakeSupabase.rpc.mock.calls.filter(([rpc]) => rpc === name);

describe('useUsageTracking', () => {
  let emit: (state: AppStateStatus) => void = () => undefined;
  let removed = false;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    removed = false;
    // the React Native jest setup leaves currentState as a bare mock function
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
      writable: true,
    });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emit = handler as (state: AppStateStatus) => void;
      return { remove: () => void (removed = true) };
    });
    setFakeRpc({ start_usage_session: 41 });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('apre la sessione con piattaforma e versione quando l’app è in primo piano', async () => {
    renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    expect(calls('start_usage_session')).toEqual([
      ['start_usage_session', { p_platform: 'ios', p_app_version: null }],
    ]);
  });

  it('tocca la sessione ogni 60 secondi', async () => {
    renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(120_000);
    expect(calls('touch_usage_session')).toEqual([
      ['touch_usage_session', { p_id: 41 }],
      ['touch_usage_session', { p_id: 41 }],
    ]);
  });

  it('chiude la sessione al passaggio in background e ne apre una nuova al ritorno', async () => {
    renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    emit('background');
    await jest.advanceTimersByTimeAsync(0);
    expect(calls('end_usage_session')).toEqual([['end_usage_session', { p_id: 41 }]]);
    await jest.advanceTimersByTimeAsync(300_000);
    expect(calls('touch_usage_session')).toHaveLength(0);
    emit('active');
    await jest.advanceTimersByTimeAsync(0);
    expect(calls('start_usage_session')).toHaveLength(2);
  });

  it('chiude la sessione anche su "inactive"', async () => {
    renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    emit('inactive');
    await jest.advanceTimersByTimeAsync(0);
    expect(calls('end_usage_session')).toHaveLength(1);
  });

  it('senza sessione attiva non chiama il server', async () => {
    renderHook(() => useUsageTracking(false));
    await jest.advanceTimersByTimeAsync(120_000);
    expect(fakeSupabase.rpc).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('allo smontaggio chiude la sessione e smette di ascoltare', async () => {
    const { unmount } = await renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    await unmount();
    await jest.advanceTimersByTimeAsync(0);
    expect(removed).toBe(true);
    expect(calls('end_usage_session')).toHaveLength(1);
  });

  it('endActiveUsageSession (prima del logout) chiude la sessione una volta sola', async () => {
    const { unmount } = await renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    await endActiveUsageSession();
    expect(calls('end_usage_session')).toHaveLength(1);
    await unmount();
    await jest.advanceTimersByTimeAsync(0);
    expect(calls('end_usage_session')).toHaveLength(1);
  });

  it('un errore del server non rompe l’app né viene propagato', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    renderHook(() => useUsageTracking(true));
    await jest.advanceTimersByTimeAsync(0);
    expect(warn).toHaveBeenCalled();
  });
});
