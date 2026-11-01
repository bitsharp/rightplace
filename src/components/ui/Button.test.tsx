import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { colors, heights } from '@/theme/tokens';

import { Button } from './Button';

describe('Button', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra la label ed esegue l’azione al tocco', async () => {
    const onPress = jest.fn();
    await render(<Button label="auth:signIn.cta" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'auth:signIn.cta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('è viola e alto 56 nella variante primaria grande', async () => {
    await render(<Button label="x" onPress={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveStyle({
      backgroundColor: colors.going,
      height: heights.button,
    });
  });

  it('è ciano con bordo nella variante secondaria e alto 44 in misura media', async () => {
    await render(<Button label="x" variant="secondary" size="md" onPress={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveStyle({
      borderColor: colors.maybe,
      backgroundColor: colors.maybeTint,
      height: heights.buttonMedium,
    });
  });

  it('non esegue l’azione se disabilitato', async () => {
    const onPress = jest.fn();
    await render(<Button label="x" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('durante il caricamento mostra lo spinner, resta occupato e ignora i tocchi', async () => {
    const onPress = jest.fn();
    await render(<Button label="x" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeBusy();
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
  });

  it('vibra con il feedback di conferma quando richiesto', async () => {
    await render(<Button label="x" onPress={jest.fn()} feedback="confirm" />);
    await fireEvent.press(screen.getByRole('button'));
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  it('non vibra di default', async () => {
    await render(<Button label="x" onPress={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
