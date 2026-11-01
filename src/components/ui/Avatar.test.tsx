import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { HandleText } from './HandleText';

describe('Avatar', () => {
  it('mostra l’iniziale su un cerchio con il bordo dell’intento', async () => {
    await render(<Avatar initial="v" intent="maybe" size={40} />);
    expect(screen.getByText('V', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      width: 40,
      borderRadius: 20,
      borderColor: colors.maybe,
      backgroundColor: colors.maybeSoft,
    });
  });

  it('funziona anche senza iniziale', async () => {
    await render(<Avatar intent="going" />);
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.going,
    });
  });
});

describe('HandleText', () => {
  it('mostra l’handle con una sola @', async () => {
    await render(<HandleText handle="@lince.rosso" />);
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
  });
});
