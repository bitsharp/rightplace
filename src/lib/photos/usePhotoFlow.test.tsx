import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { usePhotoFlow } from './usePhotoFlow';

const mockPick = jest.fn();
const mockPrepare = jest.fn();
jest.mock('./photos', () => ({
  pickPhoto: (source: string) => mockPick(source),
  preparePhoto: (photo: unknown) => mockPrepare(photo),
}));

const setOs = (os: 'ios' | 'android') => jest.replaceProperty(Platform, 'OS', os);

describe('usePhotoFlow', () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    jest.clearAllMocks();
    mockPick.mockResolvedValue({ status: 'cancelled' });
  });

  it('su iOS non lancia il picker finché il foglio non è sparito (onDismiss)', async () => {
    setOs('ios');
    const { result } = await renderHook(() => usePhotoFlow(jest.fn()));
    await act(async () => result.current.openSheet());
    await act(async () => result.current.choose('library'));
    expect(result.current.sheetOpen).toBe(false);
    expect(mockPick).not.toHaveBeenCalled();
    await act(async () => result.current.onSheetDismiss());
    expect(mockPick).toHaveBeenCalledWith('library');
  });

  it('su Android lancia il picker subito', async () => {
    setOs('android');
    const { result } = await renderHook(() => usePhotoFlow(jest.fn()));
    await act(async () => result.current.choose('camera'));
    expect(mockPick).toHaveBeenCalledWith('camera');
  });

  it('annulla (chiusura senza scelta) non lancia nulla, nemmeno a onDismiss', async () => {
    setOs('ios');
    const { result } = await renderHook(() => usePhotoFlow(jest.fn()));
    await act(async () => result.current.openSheet());
    await act(async () => result.current.closeSheet());
    await act(async () => result.current.onSheetDismiss());
    expect(mockPick).not.toHaveBeenCalled();
  });

  it('con una foto scelta passa a onReady l’uri pulito', async () => {
    setOs('android');
    const photo = { uri: 'file://a.jpg', width: 1, height: 1 };
    mockPick.mockResolvedValue({ status: 'picked', photo });
    mockPrepare.mockResolvedValue('file://clean.jpg');
    const onReady = jest.fn();
    const { result } = await renderHook(() => usePhotoFlow(onReady));
    await act(async () => result.current.choose('library'));
    expect(onReady).toHaveBeenCalledWith('file://clean.jpg');
  });

  it('segnala il rifiuto del permesso', async () => {
    setOs('android');
    mockPick.mockResolvedValue({ status: 'denied' });
    const { result } = await renderHook(() => usePhotoFlow(jest.fn()));
    await act(async () => result.current.choose('camera'));
    expect(result.current.notice).toBe('denied');
  });
});
