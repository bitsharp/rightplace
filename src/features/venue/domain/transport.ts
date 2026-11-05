export type TransportProvider = 'taxi' | 'uber' | 'freenow' | 'cabify' | 'transit';
export type TransportLink = {
  provider: TransportProvider;
  primaryUrl: string;
  fallbackUrl?: string;
};
export type TransportDirection = 'there' | 'back';

type Input = {
  direction: TransportDirection;
  venue: { name: string; lat: number; lng: number; googlePlaceId: string };
  city: { country: string; taxiNumber: string | null };
};

type Venue = Input['venue'];

const UBER = 'https://m.uber.com/ul/?action=setPickup';
const MAPS_DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&travelmode=transit';

// Deep links only, no API (roadmap 08). Brackets in Uber's keys are literal, values are encoded.
function uberLink(direction: TransportDirection, venue: Venue): TransportLink {
  const end = direction === 'there' ? 'dropoff' : 'pickup';
  const place =
    `${end}[latitude]=${venue.lat}&${end}[longitude]=${venue.lng}` +
    `&${end}[nickname]=${encodeURIComponent(venue.name)}`;
  const start = direction === 'there' ? '&pickup=my_location' : '';
  return { provider: 'uber', primaryUrl: `${UBER}${start}&${place}` };
}

function transitLink(direction: TransportDirection, venue: Venue): TransportLink {
  const end = direction === 'there' ? 'destination' : 'origin';
  const place = `${end}=${venue.lat},${venue.lng}&${end}_place_id=${encodeURIComponent(venue.googlePlaceId)}`;
  return { provider: 'transit', primaryUrl: `${MAPS_DIRECTIONS}&${place}` };
}

const LOCAL_RIDE_APPS: Record<string, TransportLink> = {
  IT: {
    provider: 'freenow',
    primaryUrl: 'freenow://',
    fallbackUrl: 'https://www.free-now.com/it/',
  },
  ES: { provider: 'cabify', primaryUrl: 'cabify://', fallbackUrl: 'https://cabify.com/es' },
};

export function buildTransportLinks({ direction, venue, city }: Input): TransportLink[] {
  const taxi: TransportLink[] = city.taxiNumber
    ? [{ provider: 'taxi', primaryUrl: `tel:${city.taxiNumber.replace(/\s+/g, '')}` }]
    : [];
  const local = LOCAL_RIDE_APPS[city.country];
  return [
    ...taxi,
    uberLink(direction, venue),
    ...(local ? [local] : []),
    transitLink(direction, venue),
  ];
}
