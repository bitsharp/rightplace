import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useAfterModalDismiss } from './useAfterModalDismiss';

describe('useAfterModalDismiss', () => {
  afterEach(() => jest.restoreAllMocks());

  it('su iOS la richiesta sopravvive ai re-render e usa la callback più recente', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const first = jest.fn();
    const latest = jest.fn();
    const { result, rerender } = await renderHook(
      ({ run }: { run: (v: string) => void }) => useAfterModalDismiss(run),
      { initialProps: { run: first } },
    );
    result.current.request('v1');
    await rerender({ run: latest });
    result.current.onDismiss();
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith('v1');
  });

  it('restituisce funzioni con identità stabile tra i render', async () => {
    const { result, rerender } = await renderHook(
      ({ run }: { run: () => void }) => useAfterModalDismiss(run),
      { initialProps: { run: () => undefined } },
    );
    const before = result.current;
    await rerender({ run: () => undefined });
    expect(result.current.request).toBe(before.request);
    expect(result.current.onDismiss).toBe(before.onDismiss);
  });

  it('esegue una sola volta anche con più onDismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const run = jest.fn();
    const { result } = await renderHook(() => useAfterModalDismiss(run));
    result.current.request('a');
    result.current.onDismiss();
    result.current.onDismiss();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('su Android esegue subito', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const run = jest.fn();
    const { result } = await renderHook(() => useAfterModalDismiss(run));
    result.current.request('a');
    expect(run).toHaveBeenCalledWith('a');
  });
});
