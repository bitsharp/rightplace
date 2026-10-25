import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('mostra il titolo e il messaggio di schermata in costruzione', async () => {
    await render(<PlaceholderScreen title="map:title" />);
    expect(screen.getByRole('header', { name: 'map:title' })).toBeOnTheScreen();
    expect(screen.getByText('common:placeholder.body')).toBeOnTheScreen();
  });

  it('mostra il contenuto aggiuntivo passato come figlio', async () => {
    await render(
      <PlaceholderScreen title="map:title">
        <Text>extra</Text>
      </PlaceholderScreen>,
    );
    expect(screen.getByText('extra')).toBeOnTheScreen();
  });
});
