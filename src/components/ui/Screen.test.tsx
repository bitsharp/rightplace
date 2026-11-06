import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import { Screen } from './Screen';

// Real devices report a home-indicator inset; the default jest mock reports zero.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe('Screen', () => {
  it('ha lo sfondo scuro e mostra il contenuto', async () => {
    await render(
      <Screen testID="screen">
        <Text>corpo</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen')).toHaveStyle({ backgroundColor: colors.background });
    expect(screen.getByText('corpo')).toBeOnTheScreen();
  });

  it('rende il contenuto scorrevole quando richiesto', async () => {
    await render(
      <Screen scroll>
        <Text>lungo</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen-scroll')).toBeOnTheScreen();
  });

  it('lascia scorrere fino in fondo sopra l’home indicator', async () => {
    await render(
      <Screen scroll>
        <Text>lungo</Text>
      </Screen>,
    );
    const content = StyleSheet.flatten(
      screen.getByTestId('screen-scroll').props.contentContainerStyle,
    );
    expect(content.paddingBottom).toBe(34 + spacing.xxl);
  });

  it('gestisce la tastiera con un’unica strategia: inset automatico dello ScrollView', async () => {
    await render(
      <Screen scroll>
        <Text>form</Text>
      </Screen>,
    );
    const scroll = screen.getByTestId('screen-scroll');
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scroll.props.keyboardDismissMode).toBeDefined();
  });

  it('senza scroll lascia comunque spazio sotto l’home indicator', async () => {
    await render(
      <Screen testID="fixed">
        <Text>fisso</Text>
      </Screen>,
    );
    const body = screen.getByText('fisso').parent;
    expect(StyleSheet.flatten(body?.props.style).paddingBottom).toBe(34 + spacing.xxl);
  });
});
