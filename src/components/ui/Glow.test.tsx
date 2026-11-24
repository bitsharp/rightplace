import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { Glow, glowStops } from './Glow';

const HIDDEN = { includeHiddenElements: true };

describe('Glow', () => {
  it('non intercetta i tocchi e non è esposto all’accessibilità', async () => {
    await render(<Glow testID="glow" />);
    const glow = screen.getByTestId('glow', HIDDEN);
    expect(glow.props.pointerEvents).toBe('none');
    expect(glow.props.accessible).toBe(false);
    expect(glow.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('è largo il doppio del raggio ricevuto', async () => {
    await render(<Glow testID="glow" radius={40} />);
    expect(screen.getByTestId('glow', HIDDEN)).toHaveStyle({ width: 80, height: 80 });
  });

  it('sfuma dal colore pieno al centro alla trasparenza sul bordo', () => {
    const stops = glowStops(colors.maybe);
    expect(stops[0]).toMatchObject({ offset: 0, color: colors.maybe });
    expect(stops[0]?.opacity).toBeGreaterThan(0.5);
    expect(stops[stops.length - 1]).toMatchObject({ offset: 1, opacity: 0 });
  });
});

describe('glowStops: intensità', () => {
  it('con intensità maggiore è più luminoso a ogni passo, senza superare l’opacità piena', () => {
    const base = glowStops(colors.going);
    const bright = glowStops(colors.going, 1.6);
    bright.forEach((stop, index) => {
      expect(stop.opacity).toBeLessThanOrEqual(1);
      expect(stop.opacity).toBeGreaterThanOrEqual(base[index]?.opacity ?? 0);
    });
    expect(bright[1]?.opacity).toBeGreaterThan(base[1]?.opacity ?? 1);
    expect(bright[bright.length - 1]?.opacity).toBe(0);
  });
});
