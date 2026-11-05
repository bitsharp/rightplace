import { buildTransportLinks } from './transport';

const venue = { name: 'Arena Club', lat: 45.4642, lng: 9.19, googlePlaceId: 'ChIJabc' };
const milan = { country: 'IT', taxiNumber: '+39 02 8585' };
const las = { country: 'ES', taxiNumber: null };

const link = (links: ReturnType<typeof buildTransportLinks>, provider: string) =>
  links.find((item) => item.provider === provider);

describe('buildTransportLinks', () => {
  it('per andare: taxi con tel: senza spazi, Uber con partenza dalla posizione e arrivo al locale', () => {
    const links = buildTransportLinks({ direction: 'there', venue, city: milan });
    expect(link(links, 'taxi')?.primaryUrl).toBe('tel:+39028585');
    expect(link(links, 'uber')?.primaryUrl).toBe(
      'https://m.uber.com/ul/?action=setPickup&pickup=my_location' +
        '&dropoff[latitude]=45.4642&dropoff[longitude]=9.19&dropoff[nickname]=Arena%20Club',
    );
  });

  it('per tornare: Uber parte dal locale', () => {
    const links = buildTransportLinks({ direction: 'back', venue, city: milan });
    expect(link(links, 'uber')?.primaryUrl).toBe(
      'https://m.uber.com/ul/?action=setPickup' +
        '&pickup[latitude]=45.4642&pickup[longitude]=9.19&pickup[nickname]=Arena%20Club',
    );
  });

  it('codifica il nome del locale nei link', () => {
    const tricky = { ...venue, name: 'Bar & Co #1 (demo)' };
    const uber = link(
      buildTransportLinks({ direction: 'there', venue: tricky, city: milan }),
      'uber',
    );
    expect(uber?.primaryUrl).toContain('dropoff[nickname]=Bar%20%26%20Co%20%231%20(demo)');
  });

  it('in Italia propone Free Now con il sito come ripiego, non Cabify', () => {
    const links = buildTransportLinks({ direction: 'there', venue, city: milan });
    expect(link(links, 'freenow')).toEqual({
      provider: 'freenow',
      primaryUrl: 'freenow://',
      fallbackUrl: 'https://www.free-now.com/it/',
    });
    expect(link(links, 'cabify')).toBeUndefined();
  });

  it('in Spagna propone Cabify con il sito come ripiego, non Free Now', () => {
    const links = buildTransportLinks({ direction: 'there', venue, city: las });
    expect(link(links, 'cabify')).toEqual({
      provider: 'cabify',
      primaryUrl: 'cabify://',
      fallbackUrl: 'https://cabify.com/es',
    });
    expect(link(links, 'freenow')).toBeUndefined();
  });

  it('il numero di Las Palmas diventa un tel: senza spazi', () => {
    const city = { country: 'ES', taxiNumber: '+34 928 46 00 00' };
    const links = buildTransportLinks({ direction: 'there', venue, city });
    expect(link(links, 'taxi')?.primaryUrl).toBe('tel:+34928460000');
  });

  it('senza numero taxi non c’è il link al taxi', () => {
    const links = buildTransportLinks({ direction: 'there', venue, city: las });
    expect(link(links, 'taxi')).toBeUndefined();
  });

  it('un paese senza servizi locali ha solo Uber e mezzi pubblici', () => {
    const links = buildTransportLinks({
      direction: 'there',
      venue,
      city: { country: 'FR', taxiNumber: null },
    });
    expect(links.map((item) => item.provider)).toEqual(['uber', 'transit']);
  });

  it('mezzi pubblici: andata con destination, ritorno con origin', () => {
    const there = buildTransportLinks({ direction: 'there', venue, city: milan });
    const back = buildTransportLinks({ direction: 'back', venue, city: milan });
    const base = 'https://www.google.com/maps/dir/?api=1&travelmode=transit&';
    expect(link(there, 'transit')?.primaryUrl).toBe(
      `${base}destination=45.4642,9.19&destination_place_id=ChIJabc`,
    );
    expect(link(back, 'transit')?.primaryUrl).toBe(
      `${base}origin=45.4642,9.19&origin_place_id=ChIJabc`,
    );
  });

  it('l’ordine è taxi, Uber, servizio locale, mezzi pubblici', () => {
    const links = buildTransportLinks({ direction: 'there', venue, city: milan });
    expect(links.map((item) => item.provider)).toEqual(['taxi', 'uber', 'freenow', 'transit']);
  });
});
