import type { Rect } from '@/features/tour/domain/layout';

// The jest preset's native methods are shared by every host component: View.measureInWindow is a jest.fn()
// that never calls back. Tests of anything positioned in the window decide what it reports.
type MeasureInWindow = jest.Mock<void, [(x: number, y: number, w: number, h: number) => void]>;

function nativeMeasure(): MeasureInWindow {
  const mocks = jest.requireActual<{ default: { measureInWindow: MeasureInWindow } }>(
    '@react-native/jest-preset/jest/MockNativeMethods',
  );
  return mocks.default.measureInWindow;
}

export function mockMeasureInWindow(rect: Rect | ((index: number) => Rect)): void {
  let calls = 0;
  nativeMeasure().mockImplementation((callback) => {
    const { x, y, width, height } = typeof rect === 'function' ? rect(calls) : rect;
    calls += 1;
    callback(x, y, width, height);
  });
}

export function resetMeasureInWindow(): void {
  nativeMeasure().mockReset();
}
