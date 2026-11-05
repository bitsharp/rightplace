import { screen, waitFor, fireEvent } from '@testing-library/react-native';

import { seedChatBackend } from '@/test/chatBackend';
import { renderApp } from '@/test/appFlows';
import { fakeSupabase } from '@/test/fakeSupabase';

const ARENA = { room_id: 'r1', venue_id: 'arena', venue_name: 'Arena Club' };

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('dal locale', () => {
  const DETAIL = {
    venue_id: 'arena',
    name: 'Arena Club',
    kind: 'club',
    address: 'Via Test 1, Milano',
    opening_hours: null,
    google_place_id: 'ChIJabc',
    lat: 45.46,
    lng: 9.19,
    city_slug: 'milano',
    city_name: 'Milano',
    country: 'IT',
    timezone: 'Europe/Rome',
    taxi_number: '+39 02 8585',
  };
  const STATS = {
    going_band: 'pochi',
    maybe_band: 'pochi',
    avg_age: null,
    female_pct: null,
    male_pct: null,
    other_pct: null,
    friends: [],
    is_sponsored: false,
  };

  it('"Chat della serata" porta alla stanza del locale se ho una stanza lì', async () => {
    seedChatBackend({ rooms: [ARENA] });
    const base = fakeSupabase.rpc.getMockImplementation();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) => {
      if (name === 'get_venue_detail') return { data: [DETAIL], error: null };
      if (name === 'get_venue_stats') return { data: [STATS], error: null };
      return base ? base(name, args) : { data: null, error: null };
    });
    await renderApp('ready', '/venue/arena');
    await fireEvent.press(await screen.findByText('chat:openFromVenue'));
    expect(
      await screen.findByRole('header', { name: 'chat:venueTitle({"venue":"Arena Club"})' }),
    ).toBeOnTheScreen();
  });

  it('senza una stanza in quel locale il bottone non compare', async () => {
    seedChatBackend({ rooms: [{ ...ARENA, venue_id: 'altro' }] });
    const base = fakeSupabase.rpc.getMockImplementation();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) => {
      if (name === 'get_venue_detail') return { data: [DETAIL], error: null };
      if (name === 'get_venue_stats') return { data: [STATS], error: null };
      return base ? base(name, args) : { data: null, error: null };
    });
    await renderApp('ready', '/venue/arena');
    expect(await screen.findByText('Arena Club')).toBeOnTheScreen();
    await waitFor(() => expect(rpcCalls('get_my_chat_rooms').length).toBeGreaterThan(0));
    expect(screen.queryByText('chat:openFromVenue')).toBeNull();
  });
});
