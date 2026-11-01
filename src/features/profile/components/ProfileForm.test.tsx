import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { ProfileForm } from './ProfileForm';

jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));
jest.mock('@/i18n', () => ({
  changeLanguage: jest.fn(() => Promise.resolve()),
  i18n: { language: 'it' },
}));

const EMPTY = {
  birthDate: null,
  gender: null,
  locale: 'it',
  locationOptIn: false,
  contactsOptIn: false,
  isCreator: false,
} as const;

async function fillValidProfile() {
  await fireEvent.changeText(screen.getByLabelText('profile:form.day'), '10');
  await fireEvent.changeText(screen.getByLabelText('profile:form.month'), '5');
  await fireEvent.changeText(screen.getByLabelText('profile:form.year'), '2000');
  await fireEvent.press(screen.getByRole('button', { name: 'profile:form.gender.female' }));
}

describe('ProfileForm', () => {
  it('tiene il CTA disabilitato finché età e genere non sono completi', async () => {
    await render(
      <ProfileForm initial={EMPTY} submitLabel="profile:setup.cta" onSubmit={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'profile:setup.cta' })).toBeDisabled();
    await fillValidProfile();
    expect(screen.getByRole('button', { name: 'profile:setup.cta' })).toBeEnabled();
  });

  it('blocca chi ha meno di 18 anni con un messaggio chiaro', async () => {
    const onSubmit = jest.fn();
    await render(<ProfileForm initial={EMPTY} submitLabel="cta" onSubmit={onSubmit} />);
    const year = String(new Date().getFullYear() - 17);
    await fireEvent.changeText(screen.getByLabelText('profile:form.day'), '1');
    await fireEvent.changeText(screen.getByLabelText('profile:form.month'), '1');
    await fireEvent.changeText(screen.getByLabelText('profile:form.year'), year);
    await fireEvent.press(screen.getByRole('button', { name: 'profile:form.gender.male' }));
    expect(screen.getByText('profile:form.underage')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'cta' })).toBeDisabled();
  });

  it('invia età, genere, lingua e consensi', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    await render(<ProfileForm initial={EMPTY} submitLabel="cta" onSubmit={onSubmit} />);
    await fillValidProfile();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'profile:form.creator' }));
    await fireEvent.press(screen.getByRole('button', { name: 'cta' }));
    expect(onSubmit).toHaveBeenCalledWith({
      birthDate: '2000-05-10',
      gender: 'female',
      locale: 'it',
      locationOptIn: false,
      contactsOptIn: false,
      isCreator: true,
    });
  });

  it('tiene la posizione spenta di default e la riporta a off se il permesso è negato', async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await render(<ProfileForm initial={EMPTY} submitLabel="cta" onSubmit={jest.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'profile:form.location.title' });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'profile:form.location.title' })).not.toBeChecked();
    expect(screen.getByText('profile:form.location.denied')).toBeOnTheScreen();
  });

  it('accende la posizione se il permesso è concesso', async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValueOnce({ granted: true } as never);
    await render(<ProfileForm initial={EMPTY} submitLabel="cta" onSubmit={jest.fn()} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'profile:form.location.title' }));
    expect(screen.getByRole('switch', { name: 'profile:form.location.title' })).toBeChecked();
  });

  it('cambia subito la lingua della UI', async () => {
    const { changeLanguage } = jest.requireMock<typeof import('@/i18n')>('@/i18n');
    await render(<ProfileForm initial={EMPTY} submitLabel="cta" onSubmit={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'profile:form.language.en' }));
    expect(changeLanguage).toHaveBeenCalledWith('en');
  });

  it('mostra l’errore del server', async () => {
    await render(
      <ProfileForm
        initial={EMPTY}
        submitLabel="cta"
        onSubmit={jest.fn()}
        errorMessage="errors:NETWORK"
      />,
    );
    expect(screen.getByText('errors:NETWORK')).toBeOnTheScreen();
  });
});
