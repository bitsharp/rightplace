import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeclareCta } from './DeclareCta';

describe('DeclareCta', () => {
  it('apre la dichiarazione', async () => {
    const onPress = jest.fn();
    await render(<DeclareCta onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:cta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('da disattivata (serata annullata) non fa nulla', async () => {
    const onPress = jest.fn();
    await render(<DeclareCta onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:cta' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
