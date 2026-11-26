import { fireEvent, render, screen } from '@testing-library/react-native';

import type { BusiestVenue } from '../api';

import { BusiestTonightCard } from './BusiestTonightCard';

const venue = (overrides: Partial<BusiestVenue> = {}): BusiestVenue => ({
  venueId: 'v1',
  name: 'Tocqueville 13',
  kind: 'club',
  typicalLevel: 3,
  photoUrl: null,
  goingBand: '20–30',
  maybeBand: '3–10',
  isEstimate: false,
  ...overrides,
});

const FRIDAY = new Date('2026-11-27T20:00:00Z');
const props = { now: FRIDAY, timeZone: 'Europe/Rome', onOpen: jest.fn() };

describe('BusiestTonightCard', () => {
  it('ha il titolo "I più animati del {giorno}" col giorno della settimana nella lingua dell’utente', async () => {
    await render(<BusiestTonightCard venues={[venue()]} {...props} />);
    expect(screen.getByText('map:busiest.title({"day":"venerdì"})')).toBeOnTheScreen();
  });

  it('con zero righe non disegna nulla', async () => {
    await render(<BusiestTonightCard venues={[]} {...props} />);
    expect(screen.queryByText(/map:busiest/)).not.toBeOnTheScreen();
  });

  it('ogni mini card dice nome, "di solito" in grigio e la fascia di stasera', async () => {
    await render(<BusiestTonightCard venues={[venue()]} {...props} />);
    expect(screen.getByText('Tocqueville 13')).toBeOnTheScreen();
    expect(screen.getByText('ui:typical.usually({"level":"ui:typical.packed"})')).toBeOnTheScreen();
    expect(screen.getByText('map:cards.tonightBand({"band":"20–30"})')).toBeOnTheScreen();
  });

  it('mai un numero esatto: nemmeno con la fascia "pochi"', async () => {
    await render(
      <BusiestTonightCard venues={[venue({ goingBand: 'pochi', typicalLevel: 2 })]} {...props} />,
    );
    expect(screen.getByText('map:cards.tonightBand({"band":"ui:band.few"})')).toBeOnTheScreen();
    expect(screen.queryByText(/^\d+$/)).not.toBeOnTheScreen();
  });

  it('STIMA compare solo sulle card con is_estimate', async () => {
    await render(
      <BusiestTonightCard
        venues={[
          venue({ venueId: 'a', name: 'Con stima', isEstimate: true }),
          venue({ venueId: 'b', name: 'Senza stima' }),
        ]}
        {...props}
      />,
    );
    expect(screen.getAllByText('ui:estimate.tag')).toHaveLength(1);
  });

  it('mostra la foto di copertina se c’è, altrimenti il blocco viola', async () => {
    await render(
      <BusiestTonightCard
        venues={[
          venue({ venueId: 'a', photoUrl: 'https://lh3.googleusercontent.com/p/a' }),
          venue({ venueId: 'b' }),
        ]}
        {...props}
      />,
    );
    expect(screen.getAllByTestId('busiest-photo')).toHaveLength(1);
    expect(screen.getAllByTestId('busiest-placeholder')).toHaveLength(1);
  });

  it('un tap apre il dettaglio di quel locale', async () => {
    const onOpen = jest.fn();
    await render(
      <BusiestTonightCard venues={[venue({ venueId: 'v7' })]} {...props} onOpen={onOpen} />,
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith('v7');
  });
});
