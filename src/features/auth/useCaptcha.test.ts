import { renderHook } from '@testing-library/react-native';
import { act } from 'react';

import { useCaptcha } from './useCaptcha';

describe('useCaptcha', () => {
  it('con la site key configurata non è pronto finché non arriva il token', async () => {
    const { result } = await renderHook(() => useCaptcha());
    expect(result.current.siteKey).toBe('1x00000000000000000000AA');
    expect(result.current.ready).toBe(false);
    await act(async () => result.current.setToken('cf-1'));
    expect(result.current.ready).toBe(true);
  });

  it('consuma il token una volta sola e ricarica il widget', async () => {
    const { result } = await renderHook(() => useCaptcha());
    await act(async () => result.current.setToken('cf-1'));
    const widgetBefore = result.current.widgetKey;
    let consumed: string | null = null;
    await act(async () => {
      consumed = result.current.consume();
    });
    expect(consumed).toBe('cf-1');
    expect(result.current.ready).toBe(false);
    expect(result.current.widgetKey).not.toBe(widgetBefore);
  });

  it('senza site key (Turnstile non ancora configurato) è sempre pronto', async () => {
    const previous = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
    process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = '';
    const { result } = await renderHook(() => useCaptcha());
    expect(result.current.siteKey).toBeNull();
    expect(result.current.ready).toBe(true);
    process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = previous;
  });
});
