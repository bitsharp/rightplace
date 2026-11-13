import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { SpotMarker } from './SpotMarker';

describe('SpotMarker', () => {
  it("mostra l'etichetta SPOT e il nome", async () => {
    await render(<SpotMarker name="Casa di Anna" onPress={jest.fn()} />);
    expect(screen.getByText('map:spot.label')).toBeOnTheScreen();
    expect(screen.getByText('Casa di Anna')).toBeOnTheScreen();
  });

  it('tronca il nome lungo a una riga', async () => {
    await render(<SpotMarker name={'x'.repeat(40)} onPress={jest.fn()} />);
    expect(screen.getByText('x'.repeat(40))).toHaveProp('numberOfLines', 1);
  });

  it('è ciano e ha una forma diversa da punto caldo (cerchio) e typical dot', async () => {
    await render(<SpotMarker name="Casa di Anna" onPress={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getByTestId('spot-marker').props.style);
    expect(style.borderColor).toBe(colors.maybe);
    expect(style.borderRadius).not.toBe(999);
    expect(style.borderStyle).toBe('solid');
  });

  it('non mostra mai un numero né una fascia', async () => {
    await render(<SpotMarker name="Casa di Anna" onPress={jest.fn()} />);
    expect(screen.queryByText(/pochi|3–10|\d/)).toBeNull();
  });

  it('nella mappa amici può mostrare il conteggio degli amici', async () => {
    await render(<SpotMarker name="Casa di Anna" caption="2" onPress={jest.fn()} />);
    expect(screen.getByText('2')).toBeOnTheScreen();
  });

  it("un tap apre lo spot e l'accessibilità lo descrive", async () => {
    const onPress = jest.fn();
    await render(<SpotMarker name="Casa di Anna" onPress={onPress} />);
    await fireEvent.press(
      screen.getByRole('button', { name: 'map:spot.a11y({"name":"Casa di Anna"})' }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
