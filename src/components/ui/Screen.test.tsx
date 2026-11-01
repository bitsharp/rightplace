import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { colors } from '@/theme/tokens';

import { Screen } from './Screen';

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
});
