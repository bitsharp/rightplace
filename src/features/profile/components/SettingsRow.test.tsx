import { fireEvent, render, screen } from '@testing-library/react-native';

import { SettingsRow } from './SettingsRow';

describe('SettingsRow', () => {
  it('mostra icona, titolo e chevron', async () => {
    await render(<SettingsRow icon="bell" title="Notifiche" onPress={jest.fn()} />);
    expect(screen.getByText('Notifiche')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-bell', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('icon-chevronRight', { includeHiddenElements: true })).toBeTruthy();
  });

  it('mostra il valore a destra e lo legge insieme al titolo', async () => {
    await render(<SettingsRow icon="globe" title="Lingua" value="Italiano" onPress={jest.fn()} />);
    expect(screen.getByText('Italiano')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Lingua, Italiano' })).toBeOnTheScreen();
  });

  it('senza valore l’etichetta è solo il titolo', async () => {
    await render(<SettingsRow icon="bell" title="Notifiche" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Notifiche' })).toBeOnTheScreen();
  });

  it('chiama onPress al tocco', async () => {
    const onPress = jest.fn();
    await render(<SettingsRow icon="bell" title="Notifiche" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Notifiche' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('l’area toccabile è alta almeno 44', async () => {
    await render(<SettingsRow icon="bell" title="Notifiche" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Notifiche' })).toHaveStyle({ minHeight: 44 });
  });
});
