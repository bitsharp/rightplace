import { fireEvent, render, screen } from '@testing-library/react-native';

import { openLink } from '@/lib/links/links';

import type { VenueDetail } from '../api';
import { VenueHeader } from './VenueHeader';

jest.mock('@/lib/links/links', () => ({ openLink: jest.fn().mockResolvedValue(true) }));

const detail: VenueDetail = {
  venueId: 'v1',
  name: 'Arena Club',
  kind: 'club',
  address: 'Via Test 1, Milano',
  openingHours: null,
  googlePlaceId: 'ChIJabc',
  lat: 45.46,
  lng: 9.19,
  citySlug: 'milano',
  cityName: 'Milano',
  country: 'IT',
  timezone: 'Europe/Rome',
  taxiNumber: null,
  photoUrl: null,
  websiteUri: null,
};

describe('VenueHeader', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mostra nome e indirizzo con l’attribuzione a Google Maps', async () => {
    await render(<VenueHeader detail={detail} closingTime={null} />);
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('Via Test 1, Milano')).toBeOnTheScreen();
    expect(screen.getByText('venues:googleAttribution')).toBeOnTheScreen();
  });

  it('con l’orario di chiusura mostra tipo e "Aperto fino alle"', async () => {
    await render(<VenueHeader detail={detail} closingTime="05:00" />);
    expect(
      screen.getByText('venue:typeLine({"kind":"venues:kind.club","time":"05:00"})'),
    ).toBeOnTheScreen();
  });

  it('senza orario mostra solo il tipo di locale', async () => {
    await render(<VenueHeader detail={detail} closingTime={null} />);
    expect(screen.getByText('venues:kind.club')).toBeOnTheScreen();
    expect(screen.queryByText(/venue:typeLine/)).toBeNull();
  });

  it('senza indirizzo omette la riga', async () => {
    await render(<VenueHeader detail={{ ...detail, address: null }} closingTime={null} />);
    expect(screen.queryByText('Via Test 1, Milano')).toBeNull();
  });

  it('"Apri in Google Maps" apre la scheda del luogo tramite openLink', async () => {
    await render(<VenueHeader detail={detail} closingTime={null} />);
    await fireEvent.press(screen.getByRole('link', { name: 'venues:openInGoogleMaps' }));
    expect(openLink).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Arena%20Club%2C%20Via%20Test%201%2C%20Milano&query_place_id=ChIJabc',
    );
  });
});
