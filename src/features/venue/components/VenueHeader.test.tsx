import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import type { VenueDetail } from '../api';
import { VenueHeader } from './VenueHeader';

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

  it('"Apri in Google Maps" apre la scheda del luogo', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<VenueHeader detail={detail} closingTime={null} />);
    await fireEvent.press(screen.getByRole('link', { name: 'venues:openInGoogleMaps' }));
    expect(open).toHaveBeenCalledWith('https://www.google.com/maps/place/?q=place_id:ChIJabc');
  });
});
