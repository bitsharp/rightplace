import { act, renderHook } from '@testing-library/react-native';

import { captureScreenshot } from './captureScreenshot';
import { resetFeedback, useFeedback } from './store/feedbackStore';
import { useOpenFeedback } from './useOpenFeedback';

jest.mock('expo-router', () => ({
  usePathname: () => '/venue/3f2b8c1e-9a4d-4e0b-8f6a-1c2d3e4f5a6b',
}));
jest.mock('./captureScreenshot', () => ({ captureScreenshot: jest.fn() }));

const capture = jest.mocked(captureScreenshot);

describe('useOpenFeedback', () => {
  beforeEach(() => resetFeedback());

  it('cattura la schermata prima di aprire il foglio e normalizza il percorso', async () => {
    const order: string[] = [];
    capture.mockImplementation(async () => {
      order.push(`capture:${useFeedback.getState().draft === null ? 'closed' : 'open'}`);
      return 'file:///s.jpg';
    });
    const { result } = await renderHook(() => useOpenFeedback());
    await act(() => result.current());
    expect(order).toEqual(['capture:closed']);
    expect(useFeedback.getState().draft).toEqual({
      screen: '/venue/[id]',
      screenshotUri: 'file:///s.jpg',
    });
  });

  it('se la cattura fallisce apre comunque il foglio, senza screenshot', async () => {
    capture.mockResolvedValue(null);
    const { result } = await renderHook(() => useOpenFeedback());
    await act(() => result.current());
    expect(useFeedback.getState().draft).toEqual({ screen: '/venue/[id]', screenshotUri: null });
  });
});
