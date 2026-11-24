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
