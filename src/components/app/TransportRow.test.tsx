import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { heights } from '@/theme/tokens';

import { TransportRow } from './TransportRow';

describe('TransportRow', () => {
  it('mostra badge, nome, dettaglio e azione e la esegue', async () => {
    const onPress = jest.fn();
    await render(
      <TransportRow
        badge="TAXI"
        name="Radiotaxi"
        detail="02 8585"
        action="CHIAMA"
        onPress={onPress}
      />,
    );
    expect(screen.getByText('TAXI')).toBeOnTheScreen();
    expect(screen.getByText('CHIAMA')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Radiotaxi, 02 8585' }));
    expect(onPress).toHaveBeenCalled();
  });

  describe('azione con icona (chiamata)', () => {
    const call = (onPress = jest.fn()) =>
      render(
        <TransportRow
          badge="TAXI"
          name="Radiotaxi"
          detail="02 8585"
          action={{ icon: 'phone' }}
          accessibilityLabel="Chiama Radiotaxi, 02 8585"
          onPress={onPress}
        />,
      );

    it('mostra la cornetta al posto della parola', async () => {
      await call();
      expect(screen.getByTestId('icon-phone', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(screen.queryByText(/chiama/i)).toBeNull();
    });

    it('la riga dice a voce cosa chiama', async () => {
      await call();
      expect(screen.getByRole('link', { name: 'Chiama Radiotaxi, 02 8585' })).toBeOnTheScreen();
    });

    it("l'area dell'icona è almeno 44 × 44 e il tap esegue l'azione", async () => {
      const onPress = jest.fn();
      await call(onPress);
      const area = StyleSheet.flatten(screen.getByTestId('transport-action').props.style);
      expect(area.minWidth).toBeGreaterThanOrEqual(heights.minTapTarget);
      expect(area.minHeight).toBeGreaterThanOrEqual(heights.minTapTarget);
      await fireEvent.press(screen.getByRole('link'));
      expect(onPress).toHaveBeenCalled();
    });
  });
});
