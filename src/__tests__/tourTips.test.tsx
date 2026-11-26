import { fireEvent, screen } from '@testing-library/react-native';

import { useMapStore } from '@/features/map/store/mapStore';
import { useTourStore } from '@/features/tour/store/tourStore';
import { renderApp } from '@/test/appFlows';
import { setFakeRpc } from '@/test/fakeSupabase';
import { seedChatBackend } from '@/test/chatBackend';
import { seedFeedBackend } from '@/test/feedBackend';
import { mockMeasureInWindow, resetMeasureInWindow } from '@/test/measure';
import { markTourSeen } from '@/test/tourState';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const GOT_IT = { name: 'tour:tip.gotIt' };
// While a tip is open the screen reader (and so the queries) sees only the tip: that is by design.
const tip = (id: string) => `tour:tips.${id}`;

const VENUE = {
  venue_id: 'arena',
  name: 'Arena Club',
  kind: 'club',
  room_id: null,
  address: 'Via Test 1, Milano',
  opening_hours: null,
  google_place_id: 'ChIJabc',
  lat: 45.4642,
  lng: 9.19,
  city_slug: 'milano',
  city_name: 'Milano',
  country: 'IT',
  timezone: 'Europe/Rome',
  taxi_number: null,
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

// Welcome already seen, no tip seen yet: the state of someone who just finished the welcome.
beforeEach(() => {
  markTourSeen();
  useTourStore.setState({ seenSteps: [] });
  mockMeasureInWindow({ x: 20, y: 100, width: 200, height: 44 });
});
afterEach(() => resetMeasureInWindow());

async function dismissAll(ids: string[]) {
  for (const id of ids) {
    expect(await screen.findByText(tip(id))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', GOT_IT));
  }
  expect(screen.queryByRole('button', GOT_IT)).not.toBeOnTheScreen();
}

describe('fumetti sul posto', () => {
  it('Mappa: il selettore Amici/Mappe, poi i bottoni della mappa, una sola volta', async () => {
    useMapStore.setState({ view: 'general' });
    setFakeRpc({
      get_active_cities: [
        { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.46, lng: 9.19, default_zoom: 13 },
      ],
      get_city_map: [],
      get_stories: [],
    });
    await renderApp('ready', '/map');
    await dismissAll(['map.viewToggle', 'map.hotSpot']);
    expect(useTourStore.getState().seenSteps).toEqual(['map.viewToggle', 'map.hotSpot']);
  });

  it('Dettaglio locale: prima il bottone CI VADO, poi le fasce', async () => {
    setFakeRpc({
      get_venue_detail: [VENUE],
      get_venue_stats: [STATS],
      get_my_declaration: [],
      get_post_target: [],
      get_story_posts: [],
      get_stories: [],
    });
    await renderApp('ready', '/venue/arena');
    await dismissAll(['venue.declare', 'venue.bands']);
  });

  it('Chat: la nota sulla chat di serata', async () => {
    seedChatBackend({ rooms: [] });
    await renderApp('ready', '/chat');
    await dismissAll(['chat.night']);
  });

  it('Amici: la ricerca per @handle', async () => {
    await renderApp('ready', '/friends');
    await dismissAll(['friends.search']);
  });

  it('Profilo di un amico: il bottone Messaggio', async () => {
    seedFeedBackend({
      users: [{ id: 'u-volpe', handle: 'volpe.viola', age_band: '25-34', gender: 'female' }],
      accepted: ['u-volpe'],
      summaries: { 'u-volpe': { follow_state: 'accepted' } },
    });
    await renderApp('ready', '/u/volpe.viola');
    await dismissAll(['profile.message']);
  });

  it('chi ha già visto un fumetto non lo rivede alla riapertura della schermata', async () => {
    useTourStore.setState({ seenSteps: ['chat.night'] });
    seedChatBackend({ rooms: [] });
    await renderApp('ready', '/chat');
    await screen.findByText('chat:list.empty');
    expect(screen.queryByRole('button', GOT_IT)).not.toBeOnTheScreen();
  });

  it('un fumetto aperto non blocca il resto: dopo “Ho capito” la schermata è usabile', async () => {
    seedChatBackend({ rooms: [] });
    await renderApp('ready', '/chat');
    await fireEvent.press(await screen.findByRole('button', GOT_IT));
    expect(await screen.findByText('chat:list.empty')).toBeOnTheScreen();
  });
});
