import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';

import { mockKeyboardEvents } from '@/test/keyboardEvents';

import { useAndroidKeyboardInset, useKeyboardHeight } from './useKeyboardHeight';

describe('useKeyboardHeight', () => {
  afterEach(() => jest.restoreAllMocks());

  it('su Android riporta l’altezza della tastiera da keyboardDidShow e torna a 0 su keyboardDidHide', async () => {
    const keyboard = mockKeyboardEvents();
    jest.replaceProperty(Platform, 'OS', 'android');
    const { result } = await renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
    await act(async () => keyboard.emit('keyboardDidShow', 312));
    expect(result.current).toBe(312);
    await act(async () => keyboard.emit('keyboardDidHide'));
    expect(result.current).toBe(0);
  });

  it('su iOS segue will-show e will-hide', async () => {
    const keyboard = mockKeyboardEvents();
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { result } = await renderHook(() => useKeyboardHeight());
    await act(async () => keyboard.emit('keyboardWillShow', 291));
    expect(result.current).toBe(291);
    await act(async () => keyboard.emit('keyboardWillHide'));
    expect(result.current).toBe(0);
  });

  it('rimuove i listener allo smontaggio', async () => {
    const remove = jest.fn();
    jest.spyOn(Keyboard, 'addListener').mockReturnValue({ remove });
    const { unmount } = await renderHook(() => useKeyboardHeight());
    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});

describe('useAndroidKeyboardInset', () => {
  afterEach(() => jest.restoreAllMocks());

  it('su Android è l’altezza della tastiera', async () => {
    const keyboard = mockKeyboardEvents();
    jest.replaceProperty(Platform, 'OS', 'android');
    const { result } = await renderHook(() => useAndroidKeyboardInset());
    await act(async () => keyboard.emit('keyboardDidShow', 300));
    expect(result.current).toBe(300);
  });

  it('su iOS resta 0, così non si somma a KeyboardAvoidingView', async () => {
    const keyboard = mockKeyboardEvents();
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { result } = await renderHook(() => useAndroidKeyboardInset());
    await act(async () => keyboard.emit('keyboardWillShow', 300));
    expect(result.current).toBe(0);
  });
});
