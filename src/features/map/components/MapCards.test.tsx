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
  isSpot: false,
};

const recommended = {
  venueId: 'v2',
  name: 'Sunset Rooftop',
  kind: 'rooftop' as const,
  reason: 'history' as const,
};

describe('MapCards: la mia serata', () => {
  const mine = {
    venueId: 'mine',
    venueName: 'Arena Club',
    eventId: null,
    intent: 'going' as const,
    expiresAt: '2026-11-14T05:00:00Z',
  };

  it('la propone per prima, prima della sponsorizzata e della consigliata', async () => {
    await render(
      <MapCards own={mine} sponsored={sponsored} recommended={recommended} onOpen={jest.fn()} />,
    );
    const labels = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel as string);
    expect(labels[0]).toBe('map:cards.own.a11y({"venue":"Arena Club","intent":"map:own.going"})');
    expect(labels).toHaveLength(3);
  });

  it('mostra locale e intenzione ("Ci vai" / "Forse") e apre il locale al tap', async () => {
    const onOpen = jest.fn();
    await render(<MapCards own={mine} sponsored={null} recommended={null} onOpen={onOpen} />);
    expect(screen.getByText('map:cards.own.label')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('map:own.going')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith('mine');
  });

  it('con "Forse" mostra "Forse"', async () => {
    await render(
      <MapCards
        own={{ ...mine, intent: 'maybe' }}
        sponsored={null}
        recommended={null}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('map:own.maybe')).toBeOnTheScreen();
  });
});

describe('MapCards', () => {
  it('senza card non disegna nulla', async () => {
    await render(<MapCards own={null} sponsored={null} recommended={null} onOpen={jest.fn()} />);
    expect(screen.queryByText(/ui:labels/)).not.toBeOnTheScreen();
  });

  it('la card sponsorizzata dice tipo e "di solito pieno" e, con punto caldo, la fascia di stasera', async () => {
    await render(
      <MapCards own={null} sponsored={sponsored} recommended={null} onOpen={jest.fn()} />,
    );
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
        own={null}
        sponsored={{ ...sponsored, typicalLevel: 0, isHotSpot: false }}
        recommended={null}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('venues:kind.club')).toBeOnTheScreen();
  });

  it('la consigliata spiega il motivo: cronologia o più caldo stasera', async () => {
    const { rerender } = await render(
      <MapCards own={null} sponsored={null} recommended={recommended} onOpen={jest.fn()} />,
    );
    expect(screen.getByText('ui:labels.recommended')).toBeOnTheScreen();
    expect(screen.getByText('map:cards.history')).toBeOnTheScreen();
    await rerender(
      <MapCards
        own={null}
        sponsored={null}
        recommended={{ ...recommended, reason: 'hot' }}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('map:cards.hot')).toBeOnTheScreen();
  });

  it('un tap su una card apre il dettaglio di quel locale', async () => {
    const onOpen = jest.fn();
    await render(
      <MapCards own={null} sponsored={sponsored} recommended={recommended} onOpen={onOpen} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'ui:labels.sponsored, Arena Club' }));
    expect(onOpen).toHaveBeenLastCalledWith('v1');
    await fireEvent.press(
      screen.getByRole('button', { name: 'ui:labels.recommended, Sunset Rooftop' }),
    );
    expect(onOpen).toHaveBeenLastCalledWith('v2');
  });
});
