import { act, renderHook } from '@testing-library/react-native';

import { useTourStore } from './store/tourStore';
import { useTourHydrated } from './useTourHydrated';

describe('useTourHydrated', () => {
  it('è vero quando lo stato salvato è già stato caricato', async () => {
    const { result } = await renderHook(() => useTourHydrated());
    expect(result.current).toBe(true);
  });

  it('parte falso e diventa vero a fine caricamento', async () => {
    const hasHydrated = jest.spyOn(useTourStore.persist, 'hasHydrated').mockReturnValue(false);
    const { result } = await renderHook(() => useTourHydrated());
    expect(result.current).toBe(false);
    hasHydrated.mockReturnValue(true);
    await act(async () => {
      await useTourStore.persist.rehydrate();
    });
    expect(result.current).toBe(true);
    hasHydrated.mockRestore();
  });
});
