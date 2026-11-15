import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, Pressable, Text } from 'react-native';

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
  afterEach(() => jest.restoreAllMocks());

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

  it('non aggiunge altezza della tastiera: ci pensa il KeyboardAvoidingView della libreria', async () => {
    for (const os of ['ios', 'android'] as const) {
      jest.replaceProperty(Platform, 'OS', os);
      mockKeyboardVisible = true;
      await render(
        <ComposerDock>
          <Text>composer</Text>
        </ComposerDock>,
      );
      expect(screen.getByTestId('composer-dock')).toHaveStyle({ paddingBottom: 0 });
      await screen.unmount();
    }
  });

  it('con la tastiera aperta il bottone invio resta toccabile al primo tap', async () => {
    mockKeyboardVisible = true;
    const onPress = jest.fn();
    await render(
      <ComposerDock>
        <Pressable accessibilityRole="button" accessibilityLabel="send" onPress={onPress} />
      </ComposerDock>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'send' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
