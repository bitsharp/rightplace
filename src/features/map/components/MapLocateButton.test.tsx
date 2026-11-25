import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { MapLocateButton } from './MapLocateButton';

describe('MapLocateButton', () => {
  it('è un bottone rotondo di 44 con etichetta, senza testo visibile', async () => {
    await render(<MapLocateButton onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'map:locate' });
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      width: 44,
      height: 44,
      borderRadius: 999,
    });
    expect(screen.queryByText('map:locate')).toBeNull();
  });

  it('chiama onPress al tap', async () => {
    const onPress = jest.fn();
    await render(<MapLocateButton onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:locate' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
