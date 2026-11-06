import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';

import { useKeyboardVisible } from './useKeyboardVisible';

type Listener = () => void;

function captureKeyboardListeners() {
  const listeners = new Map<string, Listener>();
  const remove = jest.fn();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: Listener) => {
    listeners.set(event, listener);
    return { remove };
  }) as unknown as typeof Keyboard.addListener);
  return { listeners, remove };
}

describe('useKeyboardVisible', () => {
  afterEach(() => jest.restoreAllMocks());

  it('su iOS segue gli eventi will-show e will-hide', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { listeners } = captureKeyboardListeners();
    const { result } = await renderHook(() => useKeyboardVisible());
    expect(result.current).toBe(false);
    await act(async () => listeners.get('keyboardWillShow')?.());
    expect(result.current).toBe(true);
    await act(async () => listeners.get('keyboardWillHide')?.());
    expect(result.current).toBe(false);
  });

  it('su Android segue gli eventi did-show e did-hide', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { listeners } = captureKeyboardListeners();
    const { result } = await renderHook(() => useKeyboardVisible());
    await act(async () => listeners.get('keyboardDidShow')?.());
    expect(result.current).toBe(true);
  });

  it('rimuove i listener allo smontaggio', async () => {
    const { remove } = captureKeyboardListeners();
    const { unmount } = await renderHook(() => useKeyboardVisible());
    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
