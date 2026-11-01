import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { HotSpot } from './HotSpot';

describe('HotSpot', () => {
  it('ha il diametro della fascia dominante e la mostra come label', async () => {
    await render(
      <HotSpot venueName="Navigli" goingBand="50–100" maybeBand="30–50" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveStyle({
      width: 100,
      height: 100,
    });
    expect(screen.getByText('50–100', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('è viola quando dominano i "Ci vado" e ciano quando dominano i "Forse"', async () => {
    const { rerender } = await render(
      <HotSpot venueName="A" goingBand="30–50" maybeBand="10–20" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.going,
    });
    await rerender(
      <HotSpot venueName="A" goingBand="pochi" maybeBand="20–30" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('hot-spot-outer', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.maybe,
    });
    expect(screen.getByText('20–30', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('scrive "pochi" tradotto invece di un numero', async () => {
    await render(<HotSpot venueName="A" goingBand="pochi" maybeBand="pochi" onPress={jest.fn()} />);
    expect(screen.getByText('ui:band.few', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(
      screen.queryByTestId('hot-spot-inner', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  it('disegna il cerchio interno della fascia secondaria', async () => {
    await render(<HotSpot venueName="A" goingBand="30–50" maybeBand="10–20" onPress={jest.fn()} />);
    expect(screen.getByTestId('hot-spot-inner', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.maybe,
    });
  });

  it('è un bottone accessibile che apre il locale', async () => {
    const onPress = jest.fn();
    await render(
      <HotSpot venueName="Navigli" goingBand="30–50" maybeBand="pochi" onPress={onPress} />,
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'ui:hotSpot.a11y({"venue":"Navigli","going":"30–50","maybe":"ui:band.few"})',
      }),
    );
    expect(onPress).toHaveBeenCalled();
  });

  it('mostra una didascalia al posto della fascia sulla mappa amici', async () => {
    await render(
      <HotSpot venueName="A" goingBand="pochi" maybeBand="pochi" caption="2" onPress={jest.fn()} />,
    );
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
