import { renderHook, waitFor } from '@testing-library/react-native';

import { initI18n } from './index';
import { useI18nReady } from './useI18nReady';

jest.mock('./index', () => ({ initI18n: jest.fn() }));

describe('useI18nReady', () => {
  it('diventa pronto quando le traduzioni sono caricate', async () => {
    jest.mocked(initI18n).mockResolvedValue();
    const { result } = await renderHook(() => useI18nReady());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('resta non pronto finché il caricamento non termina', async () => {
    jest.mocked(initI18n).mockReturnValue(new Promise(() => undefined));
    const { result } = await renderHook(() => useI18nReady());
    expect(result.current).toBe(false);
  });

  it('mostra comunque l’app se il caricamento fallisce', async () => {
    jest.mocked(initI18n).mockRejectedValue(new Error('storage'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = await renderHook(() => useI18nReady());
    await waitFor(() => expect(result.current).toBe(true));
  });
});
