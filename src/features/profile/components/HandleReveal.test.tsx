import { render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { HandleReveal } from './HandleReveal';

describe('HandleReveal', () => {
  it('mostra il nuovo handle con un feedback aptico', async () => {
    await render(<HandleReveal handle="lince.rosso" />);
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });
});
