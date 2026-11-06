import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { EventSpot } from './EventSpot';

describe('EventSpot', () => {
  it('ha il bordo tratteggiato per distinguersi da un punto caldo del locale', async () => {
    await render(
      <EventSpot name="Notte Techno" goingBand="10–20" maybeBand="pochi" onPress={jest.fn()} />,
    );
    const outer = StyleSheet.flatten(
      screen.getByTestId('event-spot-outer', { includeHiddenElements: true }).props.style,
    );
    expect(outer.borderStyle).toBe('dashed');
    expect(outer.borderColor).toBe(colors.going);
  });

  it('è ciano quando dominano i "Forse" (stesso linguaggio dei punti caldi)', async () => {
    await render(
      <EventSpot name="Notte" goingBand="pochi" maybeBand="20–30" onPress={jest.fn()} />,
    );
    const outer = StyleSheet.flatten(
      screen.getByTestId('event-spot-outer', { includeHiddenElements: true }).props.style,
    );
    expect(outer.borderColor).toBe(colors.maybe);
  });

  it('mostra la fascia dei "Ci vado", mai un numero esatto', async () => {
    await render(
      <EventSpot name="Notte" goingBand="pochi" maybeBand="pochi" onPress={jest.fn()} />,
    );
    expect(screen.getByText('ui:band.few', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('non ha evidenza sponsorizzata: nessuna etichetta SPONSORIZZATA', async () => {
    await render(<EventSpot name="Notte" goingBand="3–10" maybeBand="pochi" onPress={jest.fn()} />);
    expect(screen.queryByText('ui:labels.sponsored', { includeHiddenElements: true })).toBeNull();
  });

  it('è un bottone accessibile che apre la serata', async () => {
    const onPress = jest.fn();
    await render(
      <EventSpot name="Notte Techno" goingBand="3–10" maybeBand="pochi" onPress={onPress} />,
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'ui:eventSpot.a11y({"event":"Notte Techno","going":"3–10","maybe":"ui:band.few"})',
      }),
    );
    expect(onPress).toHaveBeenCalled();
  });
});
