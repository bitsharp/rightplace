import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ComposerDock } from './ComposerDock';

let mockKeyboardVisible = false;
jest.mock('@/components/ui/useKeyboardVisible', () => ({
  useKeyboardVisible: () => mockKeyboardVisible,
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe('ComposerDock', () => {
  it('con la tastiera chiusa il compositore sta sopra l’home indicator', async () => {
    mockKeyboardVisible = false;
    await render(
      <ComposerDock>
        <Text>composer</Text>
      </ComposerDock>,
    );
    expect(screen.getByTestId('composer-dock')).toHaveStyle({ paddingBottom: 34 });
  });

  it('con la tastiera aperta si appoggia ai tasti senza spazio extra', async () => {
    mockKeyboardVisible = true;
    await render(
      <ComposerDock>
        <Text>composer</Text>
      </ComposerDock>,
    );
    expect(screen.getByTestId('composer-dock')).toHaveStyle({ paddingBottom: 0 });
  });
});
