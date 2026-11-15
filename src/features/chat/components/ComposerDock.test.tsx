import { act, render, screen } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

import { mockKeyboardEvents } from '@/test/keyboardEvents';

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

  it('su Android con la tastiera aperta si alza della sua altezza, sopra i tasti', async () => {
    const keyboard = mockKeyboardEvents();
    jest.replaceProperty(Platform, 'OS', 'android');
    mockKeyboardVisible = true;
    await render(
      <ComposerDock>
        <Text>composer</Text>
      </ComposerDock>,
    );
    await act(async () => keyboard.emit('keyboardDidShow', 320));
    expect(screen.getByTestId('composer-dock')).toHaveStyle({ paddingBottom: 320 });
  });

  it('su iOS con la tastiera aperta non aggiunge altezza (ci pensa KeyboardAvoidingView)', async () => {
    const keyboard = mockKeyboardEvents();
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockKeyboardVisible = true;
    await render(
      <ComposerDock>
        <Text>composer</Text>
      </ComposerDock>,
    );
    await act(async () => keyboard.emit('keyboardWillShow', 320));
    expect(screen.getByTestId('composer-dock')).toHaveStyle({ paddingBottom: 0 });
  });
});
