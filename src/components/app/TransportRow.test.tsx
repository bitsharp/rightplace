import { fireEvent, render, screen } from '@testing-library/react-native';

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
});
