import { renderHook } from '@testing-library/react-native';

import { useOpenProfile } from './useOpenProfile';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('useOpenProfile', () => {
  beforeEach(() => mockPush.mockClear());

  it('l’handle di un altro apre il suo profilo pubblico', async () => {
    const { result } = await renderHook(() => useOpenProfile());
    result.current({ handle: 'volpe.viola', isMine: false });
    expect(mockPush).toHaveBeenCalledWith('/u/volpe.viola');
  });

  it('accetta l’handle con la chiocciola davanti', async () => {
    const { result } = await renderHook(() => useOpenProfile());
    result.current({ handle: '@volpe.viola', isMine: false });
    expect(mockPush).toHaveBeenCalledWith('/u/volpe.viola');
  });

  it('se l’autore sono io porta alla tab Profilo', async () => {
    const { result } = await renderHook(() => useOpenProfile());
    result.current({ handle: 'lince.rosso', isMine: true });
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });
});
