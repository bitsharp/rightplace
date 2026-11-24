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
    await render(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('Via Test 1, Milano')).toBeOnTheScreen();
    expect(screen.getByText('venues:googleAttribution')).toBeOnTheScreen();
  });

  it('lo stato "Aperto · Chiude alle" arriva dagli orari', async () => {
    await render(
      <VenueHeader
        detail={detail}
        status={{ kind: 'open', closesAt: '05:00' }}
        distanceKm={null}
      />,
    );
    expect(screen.getByText('venue:status.open({"time":"05:00"})')).toBeOnTheScreen();
  });

  it('chiuso: mostra "Chiuso"; senza orari noti nessuno stato', async () => {
    await render(<VenueHeader detail={detail} status={{ kind: 'closed' }} distanceKm={null} />);
    expect(screen.getByText('venue:status.closed')).toBeOnTheScreen();
    await screen.rerender(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    expect(screen.queryByText(/venue:status/)).toBeNull();
  });

  it('il tipo di locale è un chip', async () => {
    await render(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    expect(screen.getByTestId('venue-kind-chip')).toBeOnTheScreen();
    expect(screen.getByText('venues:kind.club')).toBeOnTheScreen();
  });

  it('con la posizione attiva accanto all’indirizzo c’è la distanza arrotondata', async () => {
    await render(<VenueHeader detail={detail} status={null} distanceKm={1.5} />);
    expect(screen.getByText('Via Test 1, Milano · venue:distance({"km":"1,5"})')).toBeOnTheScreen();
  });

  it('senza posizione non c’è alcuna distanza', async () => {
    await render(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    expect(screen.queryByText(/venue:distance/)).toBeNull();
  });

  it('senza indirizzo omette la riga', async () => {
    await render(
      <VenueHeader detail={{ ...detail, address: null }} status={null} distanceKm={null} />,
    );
    expect(screen.queryByText('Via Test 1, Milano')).toBeNull();
  });

  it('il nome è il titolo della schermata', async () => {
    await render(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    expect(screen.getByRole('header', { name: 'Arena Club' })).toBeOnTheScreen();
  });

  it('il nome è il titolo della schermata', async () => {
    await render(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    expect(screen.getByRole('header', { name: 'Arena Club' })).toBeOnTheScreen();
  });

  it('"Apri in Google Maps" apre la scheda del luogo tramite openLink', async () => {
    await render(<VenueHeader detail={detail} status={null} distanceKm={null} />);
    await fireEvent.press(screen.getByRole('link', { name: 'venues:openInGoogleMaps' }));
    expect(openLink).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Arena%20Club%2C%20Via%20Test%201%2C%20Milano&query_place_id=ChIJabc',
    );
  });
});
