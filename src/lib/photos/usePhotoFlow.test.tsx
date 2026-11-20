import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { usePhotoFlow } from './usePhotoFlow';

const mockPick = jest.fn();
const mockPrepare = jest.fn();
const mockShape = jest.fn();
const mockMaxSide = jest.fn();
jest.mock('./photos', () => ({
  pickPhoto: (source: string, shape: string) => {
    mockShape(shape);
    return mockPick(source);
  },
  preparePhoto: (photo: unknown, maxSide?: number) => {
    mockMaxSide(maxSide);
    return mockPrepare(photo);
  },
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

  it('la foto profilo usa il ritaglio quadrato e il lato massimo di 512', async () => {
    setOs('android');
    const photo = { uri: 'file://a.jpg', width: 1, height: 1 };
    mockPick.mockResolvedValue({ status: 'picked', photo });
    mockPrepare.mockResolvedValue('file://clean.jpg');
    const onReady = jest.fn();
    const { result } = await renderHook(() => usePhotoFlow(onReady, 'avatar'));
    await act(async () => result.current.choose('library'));
    expect(mockShape).toHaveBeenCalledWith('square');
    expect(mockMaxSide).toHaveBeenCalledWith(512);
    expect(onReady).toHaveBeenCalledWith('file://clean.jpg');
  });

  it('le foto normali restano libere e a 1280', async () => {
    setOs('android');
    mockPick.mockResolvedValue({ status: 'picked', photo: { uri: 'x', width: 1, height: 1 } });
    mockPrepare.mockResolvedValue('file://clean.jpg');
    const { result } = await renderHook(() => usePhotoFlow(jest.fn()));
    await act(async () => result.current.choose('library'));
    expect(mockShape).toHaveBeenCalledWith('free');
    expect(mockMaxSide).toHaveBeenCalledWith(1280);
  });
});
