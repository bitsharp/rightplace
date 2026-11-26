import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useFeedback } from '@/features/feedback/store/feedbackStore';
import { useTourStore } from '@/features/tour/store/tourStore';
import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { seedFriendsBackend } from '@/test/friendsBackend';

// The creator area is on in these flows (the flag-off behaviour is in creatorFlagOff.test.tsx).
process.env.EXPO_PUBLIC_CREATOR_ENABLED = 'true';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const CITIES = [
  { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.4642, lng: 9.19, default_zoom: 13 },
  {
    slug: 'las-palmas',
    name: 'Las Palmas',
    country: 'ES',
    lat: 28.1,
    lng: -15.4,
    default_zoom: 13,
  },
];

const PREFS = {
  reminder: true,
  day_after: true,
  friends: true,
  chat: true,
  feed: true,
  creator: true,
  reminder_days: [4, 5],
  reminder_time: '18:00',
};

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);
const row = (key: string) =>
  screen.getByRole('button', { name: new RegExp(`^profile:${key}(,|$)`) });

describe('profilo: impostazioni a elenco', () => {
  beforeEach(() => {
    seedFriendsBackend({ users: [] });
  });

  it('raggruppa le voci in Impostazioni account, Aiuto e supporto e Informazioni', async () => {
    await renderApp('ready', '/profile/edit');
    expect(await screen.findByText('profile:settings.groups.account')).toBeOnTheScreen();
    expect(screen.getByText('profile:settings.groups.help')).toBeOnTheScreen();
    expect(screen.getByText('profile:settings.groups.info')).toBeOnTheScreen();
  });

  it('mostra il valore attuale di lingua, città e @tag, mai il nome reale', async () => {
    setFakeRpc({ get_active_cities: CITIES });
    await renderApp('ready', '/profile/edit');
    expect(
      await screen.findByRole('button', {
        name: 'profile:settings.rows.language, profile:form.language.it',
      }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'profile:settings.rows.city, Milano' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'profile:settings.rows.tag, @lince.rosso' }),
    ).toBeOnTheScreen();
  });

  it('non offre nessuna voce per condividere la posizione', async () => {
    await renderApp('ready', '/profile/edit', { is_creator: true, is_support: true });
    await screen.findByText('profile:settings.groups.account');
    expect(screen.queryByText(/share|condividi/i)).toBeNull();
  });

  it('la voce creator c’è solo con l’area creator attiva: "Diventa creator" o "Il tuo profilo creator"', async () => {
    await renderApp('ready', '/profile/edit');
    expect(await screen.findByText('profile:app.becomeCreator')).toBeOnTheScreen();
    await screen.unmount();
    await renderApp('ready', '/profile/edit', { is_creator: true });
    expect(await screen.findByText('profile:app.creatorProfile')).toBeOnTheScreen();
  });

  it('"Feedback ricevuti" solo per il supporto', async () => {
    await renderApp('ready', '/profile/edit');
    await screen.findByText('profile:settings.groups.help');
    expect(screen.queryByText('profile:app.supportFeedback')).toBeNull();
    await screen.unmount();
    await renderApp('ready', '/profile/edit', { is_support: true });
    expect(await screen.findByText('profile:app.supportFeedback')).toBeOnTheScreen();
  });

  describe('ogni riga apre la sua schermata', () => {
    it.each([
      ['settings.rows.language', '/profile/language'],
      ['settings.rows.notifications', '/profile/notifications'],
      ['settings.rows.privacy', '/profile/privacy'],
      ['settings.rows.city', '/profile/city'],
      ['settings.rows.mapView', '/profile/map-view'],
      ['settings.rows.tag', '/profile/tag'],
      ['settings.rows.personal', '/profile/personal'],
      ['settings.rows.password', '/reset-password'],
      ['settings.rows.about', '/profile/about'],
      ['settings.rows.terms', '/legal/terms'],
      ['settings.rows.privacyPolicy', '/legal/privacy'],
    ])('%s apre %s', async (key, pathname) => {
      await renderApp('ready', '/profile/edit');
      await screen.findByText('profile:settings.groups.account');
      await fireEvent.press(row(key));
      await waitFor(() => expect(screen).toHavePathname(pathname));
    });

    it('creator apre il profilo creator', async () => {
      await renderApp('ready', '/profile/edit', { is_creator: true });
      await fireEvent.press(await screen.findByText('profile:app.creatorProfile'));
      await waitFor(() => expect(screen).toHavePathname('/creator'));
    });

    it('Feedback ricevuti apre la casella del supporto', async () => {
      await renderApp('ready', '/profile/edit', { is_support: true });
      await fireEvent.press(await screen.findByText('profile:app.supportFeedback'));
      await waitFor(() => expect(screen).toHavePathname('/support/feedback'));
    });

    it('Come funziona apre il benvenuto in modalità rivedi e azzera i suggerimenti', async () => {
      useTourStore.setState({ seenSteps: ['map.hotSpot', 'chat.night'] });
      await renderApp('ready', '/profile/edit');
      await screen.findByText('profile:settings.groups.help');
      await fireEvent.press(row('settings.rows.howItWorks'));
      await waitFor(() => expect(screen).toHavePathname('/welcome'));
      expect(await screen.findByText('tour:welcome.pages.where.title')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'tour:welcome.skip' })).toBeNull();
      expect(useTourStore.getState().seenSteps).toEqual([]);
    });

    it('chiudere la guida rivista torna al profilo e conta come vista', async () => {
      await renderApp('ready', '/profile/edit');
      await screen.findByText('profile:settings.groups.help');
      await fireEvent.press(row('settings.rows.howItWorks'));
      await fireEvent.press(await screen.findByRole('button', { name: 'tour:welcome.close' }));
      await waitFor(() => expect(screen).toHavePathname('/profile/edit'));
      expect(useTourStore.getState().welcomeSeen).toBe(true);
      expect(useTourStore.getState().seenSteps).toEqual([]);
    });

    it('Invia un feedback apre il foglio del feedback esistente', async () => {
      await renderApp('ready', '/profile/edit');
      await screen.findByText('profile:settings.groups.help');
      await fireEvent.press(row('settings.rows.feedback'));
      await waitFor(() => expect(useFeedback.getState().draft).not.toBeNull());
    });
  });

  describe('nessuna impostazione persa: tutto è raggiungibile dall’elenco', () => {
    const openRow = async (key: string, profile: Record<string, unknown> = {}) => {
      await renderApp('ready', '/profile/edit', profile);
      await screen.findByText('profile:settings.groups.account');
      await fireEvent.press(row(key));
    };

    it('lingua', async () => {
      await openRow('settings.rows.language');
      expect(
        await screen.findByRole('button', { name: 'profile:form.language.en' }),
      ).toBeOnTheScreen();
    });

    it('notifiche', async () => {
      setFakeRpc({ get_my_notification_prefs: PREFS });
      await openRow('settings.rows.notifications');
      expect(await screen.findByText('notifications:settings.title')).toBeOnTheScreen();
    });

    it('privacy: posizione, contatti, "trovami col numero" e bloccati', async () => {
      seedFriendsBackend({ users: [{ id: 'u-lupo', handle: 'lupo.verde' }], blocked: ['u-lupo'] });
      await openRow('settings.rows.privacy', { contacts_opt_in: true });
      expect(
        await screen.findByRole('switch', { name: 'profile:form.location.title' }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'profile:form.contacts.title' })).toBeOnTheScreen();
      expect(screen.getByLabelText('profile:findMe.label')).toBeOnTheScreen();
      expect(await screen.findByText('@lupo.verde')).toBeOnTheScreen();
    });

    it('privacy: senza consenso contatti non c’è "trovami col numero"', async () => {
      await openRow('settings.rows.privacy');
      await screen.findByRole('switch', { name: 'profile:form.contacts.title' });
      expect(screen.queryByLabelText('profile:findMe.label')).toBeNull();
    });

    it('città della mappa', async () => {
      setFakeRpc({ get_active_cities: CITIES });
      await openRow('settings.rows.city');
      expect(await screen.findByRole('button', { name: 'Las Palmas' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'profile:city.auto' })).toBeOnTheScreen();
    });

    it('@tag', async () => {
      await openRow('settings.rows.tag');
      expect(await screen.findByLabelText('profile:handleEditor.label')).toBeOnTheScreen();
    });

    it('dati personali: età, genere, email e, con l’area creator, "Sono un creator"', async () => {
      await openRow('settings.rows.personal');
      expect(await screen.findByLabelText('profile:form.day')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'profile:form.gender.male' })).toBeOnTheScreen();
      expect(screen.getByRole('checkbox', { name: 'profile:form.creator' })).toBeOnTheScreen();
      expect(screen.getByText('lince@example.com')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'profile:app.save' })).toBeOnTheScreen();
    });
  });

  it('Esci è un bottone sull’elenco e chiude la sessione', async () => {
    await renderApp('ready', '/profile/edit');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:account.signOut' }));
    expect(await screen.findByRole('header', { name: 'auth:signUp.title' })).toBeOnTheScreen();
  });

  it('Elimina account resta in fondo, con la doppia conferma di prima', async () => {
    await renderApp('ready', '/profile/edit');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:account.delete' }));
    await fireEvent.press(screen.getByRole('button', { name: 'profile:delete.continue' }));
    expect(rpcCalls('delete_my_account')).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'profile:delete.confirm' }));
    await waitFor(() => expect(rpcCalls('delete_my_account')).toHaveLength(1));
  });
});

describe('profilo: sotto-schermate', () => {
  beforeEach(() => {
    seedFriendsBackend({ users: [] });
  });

  it('lingua: scegliere l’inglese lo salva subito sul profilo', async () => {
    await renderApp('ready', '/profile/language');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:form.language.en' }));
    expect(rpcCalls('set_locale')[0]?.[1]).toEqual({ p_locale: 'en' });
  });

  it('privacy: il toggle contatti si salva da solo e ritira l’hash del numero', async () => {
    await renderApp('ready', '/profile/privacy', { contacts_opt_in: true });
    await fireEvent.press(
      await screen.findByRole('switch', { name: 'profile:form.contacts.title' }),
    );
    await waitFor(() => expect(rpcCalls('clear_my_phone_hash')).toHaveLength(1));
    expect(rpcCalls('complete_profile')[0]?.[1]).toMatchObject({
      p_contacts_opt_in: false,
      p_birth_date: expect.any(String),
    });
    expect(screen.queryByLabelText('profile:findMe.label')).toBeNull();
  });

  it('privacy: accendere la posizione chiede il permesso e salva solo se concesso', async () => {
    await renderApp('ready', '/profile/privacy');
    await fireEvent.press(
      await screen.findByRole('switch', { name: 'profile:form.location.title' }),
    );
    await waitFor(() =>
      expect(rpcCalls('complete_profile')[0]?.[1]).toMatchObject({ p_location_opt_in: true }),
    );
  });

  it('dati personali: salva il genere con complete_profile', async () => {
    await renderApp('ready', '/profile/personal');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:form.gender.male' }));
    await fireEvent.press(screen.getByRole('button', { name: 'profile:app.save' }));
    expect(rpcCalls('complete_profile')[0]?.[1]).toMatchObject({ p_gender: 'male' });
    expect(await screen.findByText('profile:app.saved')).toBeOnTheScreen();
  });

  it('chi siamo mostra solo il nome dell’app e la versione', async () => {
    await renderApp('ready', '/profile/about');
    const title = await screen.findByRole('header', { name: 'profile:about.title' });
    expect(title).toBeOnTheScreen();
    expect(screen.getByText('profile:about.appName')).toBeOnTheScreen();
    expect(screen.getByText(/^profile:about\.version\(\{"version":"[^"]*"\}\)$/)).toBeOnTheScreen();
  });

  it('la freccia indietro di una sotto-schermata torna all’elenco', async () => {
    await renderApp('ready', '/profile/edit');
    await screen.findByText('profile:settings.groups.account');
    await fireEvent.press(row('settings.rows.about'));
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:lists.back' }));
    await waitFor(() => expect(screen).toHavePathname('/profile/edit'));
  });
});
