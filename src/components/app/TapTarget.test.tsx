import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TapTarget } from './TapTarget';

describe('TapTarget', () => {
  it('con onPress è un bottone che lo chiama', async () => {
    const onPress = jest.fn();
    await render(
      <TapTarget accessibilityRole="button" accessibilityLabel="Apri" onPress={onPress}>
        <Text>x</Text>
      </TapTarget>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Apri' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('senza onPress resta accessibile ma non intercetta il tocco', async () => {
    await render(
      <TapTarget accessibilityRole="button" accessibilityLabel="Apri">
        <Text>x</Text>
      </TapTarget>,
    );
    expect(screen.getByRole('button', { name: 'Apri' }).props.onResponderRelease).toBeUndefined();
  });
});
