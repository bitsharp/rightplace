import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { HANDLE_AVAILABILITY_DEBOUNCE_MS, useHandleAvailability } from './useHandleAvailability';

const availabilityCalls = () =>
  fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'is_handle_available');

async function setup(candidate: string, current = 'lince.rosso') {
  const { Wrapper } = createQueryWrapper();
  return renderHook((text: string) => useHandleAvailability(text, current), {
    wrapper: Wrapper,
    initialProps: candidate,
  });
}

describe('useHandleAvailability', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  it('aspetta 400 ms dall’ultimo carattere prima di chiamare il server', async () => {
    expect(HANDLE_AVAILABILITY_DEBOUNCE_MS).toBe(400);
    setFakeRpc({ is_handle_available: 'available' });
    const { result, rerender } = await setup('luc');
    expect(result.current).toEqual({ kind: 'checking' });
    await act(async () => jest.advanceTimersByTime(300));
    await rerender('luca');
    await act(async () => jest.advanceTimersByTime(300));
    expect(availabilityCalls()).toHaveLength(0);
    await act(async () => jest.advanceTimersByTime(100));
    await waitFor(() => expect(availabilityCalls()).toHaveLength(1));
    expect(availabilityCalls()[0]?.[1]).toEqual({ p_handle: 'luca' });
    await waitFor(() => expect(result.current).toEqual({ kind: 'result', value: 'available' }));
  });

  it('segnala subito un formato sbagliato senza chiamare il server', async () => {
    const { result } = await setup('1luca');
    expect(result.current).toEqual({ kind: 'format', error: 'badStart' });
    await act(async () => jest.advanceTimersByTime(HANDLE_AVAILABILITY_DEBOUNCE_MS * 2));
    expect(availabilityCalls()).toHaveLength(0);
  });

  it('non controlla il campo vuoto né il proprio @tag attuale', async () => {
    const empty = await setup('');
    expect(empty.result.current).toEqual({ kind: 'idle' });
    const same = await setup('lince.rosso');
    expect(same.result.current).toEqual({ kind: 'idle' });
    await act(async () => jest.advanceTimersByTime(HANDLE_AVAILABILITY_DEBOUNCE_MS * 2));
    expect(availabilityCalls()).toHaveLength(0);
  });

  it.each(['taken', 'not_allowed', 'invalid'] as const)('riporta lo stato %s', async (value) => {
    setFakeRpc({ is_handle_available: value });
    const { result } = await setup('luca_97');
    await act(async () => jest.advanceTimersByTime(HANDLE_AVAILABILITY_DEBOUNCE_MS));
    await waitFor(() => expect(result.current).toEqual({ kind: 'result', value }));
  });

  it('se il controllo fallisce non blocca: stato error', async () => {
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = await setup('luca_97');
    await act(async () => jest.advanceTimersByTime(HANDLE_AVAILABILITY_DEBOUNCE_MS));
    await waitFor(() => expect(result.current).toEqual({ kind: 'error' }));
  });
});
