import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors, heights } from '@/theme/tokens';

import { PasswordField } from './PasswordField';
import { SearchField } from './SearchField';
import { TextField } from './TextField';

describe('TextField', () => {
  it('mostra la label sopra e collega l’input alla label', async () => {
    await render(<TextField label="auth:email" value="" onChangeText={jest.fn()} />);
    expect(screen.getByText('auth:email')).toBeOnTheScreen();
    expect(screen.getByLabelText('auth:email')).toHaveStyle({ height: heights.field });
  });

  it('inoltra il testo digitato', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="auth:email" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('auth:email'), 'a@b.it');
    expect(onChangeText).toHaveBeenCalledWith('a@b.it');
  });

  it('mostra l’errore e colora il bordo', async () => {
    await render(
      <TextField label="auth:email" value="" onChangeText={jest.fn()} error="auth:errors.email" />,
    );
    expect(screen.getByText('auth:errors.email')).toBeOnTheScreen();
    expect(screen.getByLabelText('auth:email')).toHaveStyle({ borderColor: colors.error });
  });
});

describe('PasswordField', () => {
  it('nasconde la password e la mostra a richiesta', async () => {
    await render(<PasswordField label="auth:password" value="segreta" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('auth:password')).toHaveProp('secureTextEntry', true);
    await fireEvent.press(screen.getByRole('button', { name: 'ui:password.show' }));
    expect(screen.getByLabelText('auth:password')).toHaveProp('secureTextEntry', false);
    expect(screen.getByRole('button', { name: 'ui:password.hide' })).toBeOnTheScreen();
  });
});

describe('SearchField', () => {
  it('ha l’icona di ricerca e inoltra il testo', async () => {
    const onChangeText = jest.fn();
    await render(<SearchField label="venue:search" value="" onChangeText={onChangeText} />);
    expect(screen.getByTestId('icon-search', { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('venue:search'), 'navigli');
    expect(onChangeText).toHaveBeenCalledWith('navigli');
  });

  it('mostra la @ per cercare gli handle', async () => {
    await render(
      <SearchField label="friends:search" prefix="handle" value="" onChangeText={jest.fn()} />,
    );
    expect(screen.getByText('@')).toBeOnTheScreen();
  });
});
