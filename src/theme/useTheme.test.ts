import { renderHook } from '@testing-library/react-native';

import { colors, spacing } from './tokens';
import { typography } from './typography';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('espone token e tipografia del tema scuro', async () => {
    const { result } = await renderHook(() => useTheme());
    expect(result.current.colors).toBe(colors);
    expect(result.current.spacing).toBe(spacing);
    expect(result.current.typography).toBe(typography);
  });
});
