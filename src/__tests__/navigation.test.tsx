import { fireEvent, screen } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';

// Creator area on: these flows cover it; the flag-off behaviour is in creatorFlagOff.test.tsx.
process.env.EXPO_PUBLIC_CREATOR_ENABLED = 'true';

describe('guard di sessione', () => {
  it('senza account apre la registrazione', async () => {
    await renderApp('signedOut');
    expect(await screen.findByRole('header', { name: 'auth:signUp.title' })).toBeOnTheScreen();
  });

  it('senza account non si apre una tab', async () => {
    await renderApp('signedOut', '/map');
    expect(await screen.findByRole('header', { name: 'auth:signUp.title' })).toBeOnTheScreen();
  });

  it('con email da confermare porta alla verifica', async () => {
    await renderApp('unverified');
    expect(await screen.findByRole('header', { name: 'auth:verify.title' })).toBeOnTheScreen();
  });

  it('con profilo incompleto porta al profilo privato, anche se si prova ad aprire la mappa', async () => {
    await renderApp('needsProfile', '/map');
    expect(await screen.findByRole('header', { name: 'profile:setup.title' })).toBeOnTheScreen();
  });

  it('con profilo completo apre la mappa', async () => {
    await renderApp('ready');
    expect(await screen.findByRole('button', { name: 'map:view.general' })).toBeOnTheScreen();
  });

  it('a profilo completo le schermate di accesso non sono più raggiungibili', async () => {
    await renderApp('ready', '/sign-in');
    expect(await screen.findByRole('button', { name: 'map:view.general' })).toBeOnTheScreen();
  });
});

describe('tab bar e route', () => {
  it('mostra le 5 voci e naviga tra le tab', async () => {
    await renderApp('ready', '/map');
    for (const tab of ['map', 'friends', 'chat', 'feed', 'profile']) {
      expect(await screen.findByText(`common:tabs.${tab}`)).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByText('common:tabs.friends'));
    expect(await screen.findByLabelText('friends:searchLabel')).toBeOnTheScreen();
  });

  it.each([
    ['/venue/abc', 'venue:title'],
    ['/event/abc', 'venue:eventTitle'],
    ['/night/abc/chat', 'chat:nightTitle'],
    ['/post/new', 'post:title'],
    ['/creator', 'creator:title'],
    ['/creator/new-event', 'creator:newEvent'],
    ['/creator/billing', 'creator:billing'],
  ])('apre la route %s', async (url, titleKey) => {
    await renderApp('ready', url);
    expect(await screen.findByRole('header', { name: titleKey })).toBeOnTheScreen();
  });

  it.each(['/legal/privacy', '/legal/terms'])('apre %s anche senza account', async (url) => {
    await renderApp('signedOut', url);
    expect(
      await screen.findByRole('header', { name: `legal:${url.split('/')[2]}.title` }),
    ).toBeOnTheScreen();
  });

  it('apre la UI kit in sviluppo', async () => {
    await renderApp('signedOut', '/ui-kit');
    expect(await screen.findByRole('header', { name: 'dev:title' })).toBeOnTheScreen();
  });
});
