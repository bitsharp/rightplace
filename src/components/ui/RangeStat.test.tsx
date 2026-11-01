import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { RangeStat } from './RangeStat';

describe('RangeStat', () => {
  it('mostra la fascia dei SI in viola', async () => {
    await render(<RangeStat intent="going" band="30–50" />);
    expect(screen.getByText('ui:intent.going')).toHaveStyle({ color: colors.going });
    expect(screen.getByText('30–50')).toBeOnTheScreen();
    expect(screen.getByText('ui:people')).toBeOnTheScreen();
  });

  it('traduce "pochi" invece di mostrare un numero', async () => {
    await render(<RangeStat intent="maybe" band="pochi" />);
    expect(screen.getByText('ui:intent.maybe')).toHaveStyle({ color: colors.maybe });
    expect(screen.getByText('ui:band.few')).toBeOnTheScreen();
  });
});
