import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MapVenue } from '../domain/mapLayers';

import { MapCards } from './MapCards';

const sponsored: MapVenue = {
  venueId: 'v1',
  name: 'Arena Club',
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typicalLevel: 3,
  goingBand: '3–10',
  maybeBand: 'pochi',
  isHotSpot: true,
  isSponsored: true,
  friendsGoing: null,
  friendsCount: null,
};

const recommended = {
  venueId: 'v2',
  name: 'Sunset Rooftop',
  kind: 'rooftop' as const,
  reason: 'history' as const,
};

describe('MapCards', () => {
  it('senza card non disegna nulla', async () => {
    await render(<MapCards sponsored={null} recommended={null} onOpen={jest.fn()} />);
    expect(screen.queryByText(/ui:labels/)).not.toBeOnTheScreen();
  });

  it('la card sponsorizzata dice tipo e "di solito pieno" e, con punto caldo, la fascia di stasera', async () => {
    await render(<MapCards sponsored={sponsored} recommended={null} onOpen={jest.fn()} />);
    expect(screen.getByText('ui:labels.sponsored')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'venues:kind.club · ui:typical.usually({"level":"ui:typical.packed"}) · map:cards.tonightBand({"band":"3–10"})',
      ),
    ).toBeOnTheScreen();
  });

  it('con typical 0 e senza punto caldo mostra solo il tipo', async () => {
    await render(
      <MapCards
        sponsored={{ ...sponsored, typicalLevel: 0, isHotSpot: false }}
        recommended={null}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('venues:kind.club')).toBeOnTheScreen();
  });

  it('la consigliata spiega il motivo: cronologia o più caldo stasera', async () => {
    const { rerender } = await render(
      <MapCards sponsored={null} recommended={recommended} onOpen={jest.fn()} />,
    );
    expect(screen.getByText('ui:labels.recommended')).toBeOnTheScreen();
    expect(screen.getByText('map:cards.history')).toBeOnTheScreen();
    await rerender(
      <MapCards
        sponsored={null}
        recommended={{ ...recommended, reason: 'hot' }}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('map:cards.hot')).toBeOnTheScreen();
  });

  it('un tap su una card apre il dettaglio di quel locale', async () => {
    const onOpen = jest.fn();
    await render(<MapCards sponsored={sponsored} recommended={recommended} onOpen={onOpen} />);
    await fireEvent.press(screen.getByRole('button', { name: 'ui:labels.sponsored, Arena Club' }));
    expect(onOpen).toHaveBeenLastCalledWith('v1');
    await fireEvent.press(
      screen.getByRole('button', { name: 'ui:labels.recommended, Sunset Rooftop' }),
    );
    expect(onOpen).toHaveBeenLastCalledWith('v2');
  });
});
