import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/tokens';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('è uno switch accessibile con titolo e descrizione', async () => {
    await render(
      <Toggle
        title="profile:location.title"
        description="profile:location.body"
        value={false}
        onValueChange={jest.fn()}
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'profile:location.title' });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveProp('accessibilityHint', 'profile:location.body');
    expect(screen.getByText('profile:location.body')).toBeOnTheScreen();
  });

  it('inverte il valore al tocco con feedback aptico', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle title="t" value={false} onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('colora di viola l’interruttore acceso', async () => {
    await render(<Toggle title="t" value onValueChange={jest.fn()} />);
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByTestId('toggle-track')).toHaveStyle({ backgroundColor: colors.going });
  });

  it('mostra il suffisso "facoltativo" quando indicato', async () => {
    await render(<Toggle title="t" optional value={false} onValueChange={jest.fn()} />);
    expect(screen.getByText(/ui:optional/)).toBeOnTheScreen();
  });
});
