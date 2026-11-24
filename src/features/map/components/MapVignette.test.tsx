import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { gradientStops } from '@/test/svgGradient';
import { colors } from '@/theme/tokens';

import { MapVignette } from './MapVignette';

const HIDDEN = { includeHiddenElements: true };

describe('MapVignette', () => {
  it('non intercetta i gesti e non è esposto all’accessibilità', async () => {
    await render(<MapVignette />);
    const veil = screen.getByTestId('map-vignette', HIDDEN);
    expect(veil.props.pointerEvents).toBe('none');
    expect(veil.props.accessible).toBe(false);
    expect(veil.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('copre tutta la mappa senza spostare nulla', async () => {
    await render(<MapVignette />);
    expect(screen.getByTestId('map-vignette', HIDDEN)).toHaveStyle({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
  });

  it('usa solo colori dei token: viola al centro, sfondo ai bordi', async () => {
    await render(<MapVignette />);
    const [center, edges] = gradientStops(screen.getByTestId('map-vignette', HIDDEN));
    expect(center?.every((stop) => stop.hex === colors.primary)).toBe(true);
    expect(edges?.every((stop) => stop.hex === colors.background)).toBe(true);
    expect(center?.[0]?.alpha).toBeGreaterThan(0);
    expect(center?.[0]?.alpha).toBeLessThan(0.3);
    expect(edges?.[0]?.alpha).toBe(0);
    expect(edges?.[edges.length - 1]?.alpha).toBeGreaterThan(0.5);
  });

  it('su iOS aggiunge un leggero tono viola, su Android no', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { unmount } = await render(<MapVignette />);
    expect(screen.getByTestId('map-vignette-tint', HIDDEN)).toBeOnTheScreen();
    await unmount();
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<MapVignette />);
    expect(screen.queryByTestId('map-vignette-tint', HIDDEN)).toBeNull();
  });
});
