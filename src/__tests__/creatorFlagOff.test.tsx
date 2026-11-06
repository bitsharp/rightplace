import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const CREATOR_URLS = [
  '/creator',
  '/creator/new-event',
  '/creator/event/e1',
  '/creator/edit-event/e1',
  '/creator/billing',
];

const eventDetail = {
  event_id: 'e1',
  name: 'Notte Techno',
  description: 'Dj set tutta la notte',
  starts_at: '2026-11-06T21:00:00Z',
  ends_at: '2026-11-07T03:00:00Z',
  cancelled_at: null,
  target_age_bands: ['18-24'],
  target_genders: [],
  venue_id: 'arena',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  address: null,
  lat: 45.4642,
  lng: 9.19,
  city_slug: 'milano',
  timezone: 'Europe/Rome',
  taxi_number: null,
  going_band: '10–20',
  maybe_band: 'pochi',
  avg_age: null,
  female_pct: null,
  male_pct: null,
  other_pct: null,
  friends: [],
  is_mine: false,
  creator_handle: 'lince.rosso',
};

const originalFlag = process.env.EXPO_PUBLIC_CREATOR_ENABLED;
afterEach(() => {
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_CREATOR_ENABLED;
  else process.env.EXPO_PUBLIC_CREATOR_ENABLED = originalFlag;
});

describe('area creator con flag spento (build tester)', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_CREATOR_ENABLED = 'false';
  });

  it.each(CREATOR_URLS)('reindirizza %s senza mostrare la schermata', async (url) => {
    await renderApp('ready', url, { is_creator: true });
    await waitFor(() => expect(screen).not.toHavePathname(url));
    expect(screen.queryByRole('header', { name: /^creator:/ })).not.toBeOnTheScreen();
  });

  it('nel profilo non mostra né il toggle né il link creator', async () => {
    await renderApp('ready', '/profile', { is_creator: true });
    await screen.findByRole('button', { name: 'profile:app.save' });
    expect(screen.queryByText('profile:app.creatorProfile')).not.toBeOnTheScreen();
    expect(screen.queryByText('profile:app.becomeCreator')).not.toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: 'profile:form.creator' })).not.toBeOnTheScreen();
  });

  it('salvando il profilo non cambia is_creator di chi lo è già', async () => {
    await renderApp('ready', '/profile', { is_creator: true });
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:form.gender.male' }));
    await fireEvent.press(screen.getByRole('button', { name: 'profile:app.save' }));
    expect(fakeSupabase.rpc).toHaveBeenCalledWith(
      'complete_profile',
      expect.objectContaining({ p_is_creator: true }),
    );
  });

  it('continua ad aprire una serata creata da altri', async () => {
    setFakeRpc({ get_event_detail: [eventDetail] });
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('Notte Techno')).toBeOnTheScreen();
    expect(screen).toHavePathname('/event/e1');
  });
});
