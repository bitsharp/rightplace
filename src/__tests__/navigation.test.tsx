import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import path from 'path';

import { useSessionStore } from '@/features/auth/store/sessionStore';

const APP_DIR = path.join(__dirname, '..', '..', 'app');

describe('guard di sessione', () => {
  beforeEach(() => useSessionStore.getState().signOut());

  it("manda all'accesso chi apre l'app senza sessione", async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByRole('header', { name: 'auth:signIn.title' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/sign-in');
  });

  it('non lascia aprire una tab senza sessione', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/friends' });
    expect(await screen.findByRole('header', { name: 'auth:signIn.title' })).toBeOnTheScreen();
  });

  it('porta alla mappa dopo l’ingresso in modalità demo', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/sign-in' });
    await fireEvent.press(await screen.findByText('auth:signIn.demoEnter'));
    expect(await screen.findByRole('header', { name: 'map:title' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/map');
  });

  it("riporta all'accesso dopo l'uscita dal profilo", async () => {
    useSessionStore.getState().signIn();
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await fireEvent.press(await screen.findByText('profile:signOut'));
    expect(await screen.findByRole('header', { name: 'auth:signIn.title' })).toBeOnTheScreen();
  });
});

describe('tab bar', () => {
  beforeEach(() => useSessionStore.getState().signIn());

  it('mostra le 5 voci e naviga tra le tab', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/map' });
    for (const tab of ['map', 'friends', 'chat', 'feed', 'profile']) {
      expect(await screen.findByText(`common:tabs.${tab}`)).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByText('common:tabs.friends'));
    expect(await screen.findByRole('header', { name: 'friends:title' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/friends');
  });

  it.each([
    ['/venue/abc', 'venue:title'],
    ['/event/abc', 'venue:eventTitle'],
    ['/night/abc/chat', 'chat:nightTitle'],
    ['/post/new', 'feed:newPost'],
    ['/creator', 'creator:title'],
    ['/creator/new-event', 'creator:newEvent'],
    ['/creator/billing', 'creator:billing'],
  ])('apre la route %s', async (url, titleKey) => {
    await renderRouter(APP_DIR, { initialUrl: url });
    expect(await screen.findByRole('header', { name: titleKey })).toBeOnTheScreen();
  });
});
