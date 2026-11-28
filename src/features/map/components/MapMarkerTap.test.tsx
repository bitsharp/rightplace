import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import type { HotSpotVenue } from '../domain/mapLayers';

import { MapCanvas } from './MapCanvas';

const venue = (overrides: Partial<HotSpotVenue> & { venueId: string }): HotSpotVenue => ({
  name: `Locale ${overrides.venueId}`,
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typicalLevel: 0,
  goingBand: '3–10',
  maybeBand: 'pochi',
  isHotSpot: true,
  isSponsored: false,
  friendsGoing: null,
  friendIds: null,
  friendsCount: null,
  isSpot: false,
  ...overrides,
});

const city = { slug: 'milano', name: 'Milano', lat: 45.4642, lng: 9.19, defaultZoom: 13 };
const noLayers = { hotSpots: [], spots: [] };
const withFriends = venue({
  venueId: 'hot',
  friendsGoing: ['volpe.viola'],
  friendIds: ['u-volpe'],
  friendsCount: 1,
});
const ownSpot = { venueId: 'mine', name: 'Mio', intent: 'going' as const, lat: 45.46, lng: 9.19 };
const me = { userId: 'u-me', handle: 'lince.rosso' };

const marker = (id: string) => screen.getByTestId(`marker-${id}`, { includeHiddenElements: true });
const tapArea = (id: string) =>
  screen.getByTestId(`tap-marker-${id}`, { includeHiddenElements: true });

describe('tap sui marker della mappa', () => {
  describe('iOS: un solo Pressable per marker, il Marker non usa onPress', () => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

    it('ogni tap sullo stesso punto caldo apre il locale, anche dopo il ritorno dal dettaglio', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          city={city}
          view="general"
          you={null}
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [venue({ venueId: 'hot' })], spots: [] }}
        />,
      );
      expect(marker('hot-hot').props.onPress).toBeUndefined();
      await fireEvent.press(tapArea('hot-hot'));
      await fireEvent.press(tapArea('hot-hot'));
      await fireEvent.press(tapArea('hot-hot'));
      expect(onOpenVenue).toHaveBeenCalledTimes(3);
      expect(onOpenVenue).toHaveBeenLastCalledWith('hot');
    });

    it('un tap sui volti apre il locale con una sola chiamata', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          city={city}
          view="friends"
          you={null}
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [withFriends], spots: [] }}
        />,
      );
      expect(marker('hot-hot').props.onPress).toBeUndefined();
      await fireEvent.press(screen.getByTestId('friend-faces', { includeHiddenElements: true }));
      expect(onOpenVenue).toHaveBeenCalledTimes(1);
      expect(onOpenVenue).toHaveBeenCalledWith('hot');
    });

    it('lo spot, la mia serata e la serata del creator hanno ciascuno un solo punto di tap', async () => {
      const onOpenVenue = jest.fn();
      const onOpenEvent = jest.fn();
      await render(
        <MapCanvas
          city={city}
          view="general"
          you={null}
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [], spots: [{ ...venue({ venueId: 's1' }), isSpot: true }] }}
          ownSpot={ownSpot}
          me={me}
          events={[
            {
              lat: 45.5,
              lng: 9.2,
              event: {
                eventId: 'e1',
                name: 'Notte',
                goingBand: '3–10',
                maybeBand: 'pochi',
              },
            } as never,
          ]}
          onOpenEvent={onOpenEvent}
        />,
      );
      await fireEvent.press(tapArea('spot-s1'));
      await fireEvent.press(tapArea('own'));
      await fireEvent.press(tapArea('event-e1'));
      expect(onOpenVenue.mock.calls).toEqual([['s1'], ['mine']]);
      expect(onOpenEvent.mock.calls).toEqual([['e1']]);
    });
  });

  describe('Android: onPress del Marker, nessun Pressable', () => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));

    it("ogni tap sul Marker apre il locale e non c'è un secondo percorso", async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          city={city}
          view="general"
          you={null}
          onOpenVenue={onOpenVenue}
          layers={{ hotSpots: [venue({ venueId: 'hot' })], spots: [] }}
        />,
      );
      expect(
        screen.queryByTestId('tap-marker-hot-hot', { includeHiddenElements: true }),
      ).toBeNull();
      await fireEvent.press(marker('hot-hot'));
      await fireEvent.press(marker('hot-hot'));
      expect(onOpenVenue).toHaveBeenCalledTimes(2);
      expect(onOpenVenue).toHaveBeenLastCalledWith('hot');
    });

    it('la mia serata apre il locale dal Marker', async () => {
      const onOpenVenue = jest.fn();
      await render(
        <MapCanvas
          city={city}
          view="general"
          you={null}
          onOpenVenue={onOpenVenue}
          layers={noLayers}
          ownSpot={ownSpot}
          me={me}
        />,
      );
      await fireEvent.press(marker('own'));
      expect(onOpenVenue).toHaveBeenCalledWith('mine');
    });
  });
});
