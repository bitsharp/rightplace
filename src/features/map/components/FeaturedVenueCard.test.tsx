import { fireEvent, render, screen } from '@testing-library/react-native';

import type { HotSpotVenue } from '../domain/mapLayers';

import { FeaturedVenueCard } from './FeaturedVenueCard';

const venue = (overrides: Partial<HotSpotVenue> = {}): HotSpotVenue => ({
  venueId: 'v1',
  name: 'Tocqueville 13',
  kind: 'club',
  lat: 45.4642,
  lng: 9.19,
  typicalLevel: 3,
  goingBand: '20–30',
  maybeBand: '10–20',
  isHotSpot: true,
  isSponsored: false,
  friendsGoing: null,
  friendIds: null,
  friendsCount: null,
  isSpot: false,
  ...overrides,
});

const props = { photoUrl: null, you: null, onPress: jest.fn() };

describe('FeaturedVenueCard', () => {
  it('mostra il nome, il tipo e la fascia di affluenza, mai un numero esatto', async () => {
    await render(<FeaturedVenueCard venue={venue()} {...props} />);
    expect(screen.getByText('Tocqueville 13')).toBeOnTheScreen();
    expect(screen.getByText('venues:kind.club')).toBeOnTheScreen();
    expect(screen.getByText('20–30 ui:people')).toBeOnTheScreen();
    expect(screen.queryByText(/\b(23|24|38)\b/)).toBeNull();
  });

  it('sotto la soglia scrive "pochi" tradotto, senza cifre', async () => {
    await render(
      <FeaturedVenueCard venue={venue({ goingBand: 'pochi', name: 'Arena Club' })} {...props} />,
    );
    expect(screen.getByText('ui:band.few')).toBeOnTheScreen();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('senza posizione attiva non scrive nessuna distanza', async () => {
    await render(<FeaturedVenueCard venue={venue()} {...props} you={null} />);
    expect(screen.queryByText(/km/)).toBeNull();
  });

  it('con la posizione attiva scrive la distanza arrotondata ai 500 m', async () => {
    await render(
      <FeaturedVenueCard venue={venue()} {...props} you={{ lat: 45.4642, lng: 9.2123 }} />,
    );
    expect(screen.getByText('map:card.distance({"km":"1,5"})')).toBeOnTheScreen();
  });

  it('mostra la foto di copertina quando c’è e la didascalia "Foto da Google Maps" per chi usa lo screen reader', async () => {
    await render(<FeaturedVenueCard venue={venue()} {...props} photoUrl="https://img/x.jpg" />);
    expect(screen.getByTestId('featured-venue-photo')).toBeOnTheScreen();
    expect(screen.getByLabelText('venue:cover.caption')).toBeOnTheScreen();
  });

  it('senza foto mostra il segnaposto del tipo di locale', async () => {
    await render(<FeaturedVenueCard venue={venue()} {...props} />);
    expect(screen.queryByTestId('featured-venue-photo')).toBeNull();
    expect(screen.getByTestId('venue-cover-art')).toBeOnTheScreen();
  });

  it('è un bottone che apre il dettaglio del locale', async () => {
    const onPress = jest.fn();
    await render(<FeaturedVenueCard venue={venue()} {...props} onPress={onPress} />);
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'map:card.a11y({"venue":"Tocqueville 13","band":"20–30 ui:people"})',
      }),
    );
    expect(onPress).toHaveBeenCalledWith('v1');
  });
});

// The RPC may still send is_estimate: the UI must ignore it.
const withEstimate = <T,>(row: T) => Object.assign({}, row, { isEstimate: true });

describe('FeaturedVenueCard: presenze stimate', () => {
  it('non mostra nessuna etichetta di stima nemmeno se il dato la porta', async () => {
    await render(<FeaturedVenueCard venue={withEstimate(venue())} {...props} />);
    expect(screen.queryByText('ui:estimate.tag')).not.toBeOnTheScreen();
  });
});
