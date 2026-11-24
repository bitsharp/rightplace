import { fireEvent, render, screen } from '@testing-library/react-native';

import { MapSearchEntry } from './MapSearchEntry';

describe('MapSearchEntry', () => {
  it('mostra la città e apre la ricerca', async () => {
    const onPress = jest.fn();
    await render(<MapSearchEntry cityName="Milano" onPress={onPress} />);
    expect(screen.getByText('Milano')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'map:searchPlaceholder' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('senza posizione attiva non offre "vai alla mia posizione"', async () => {
    await render(<MapSearchEntry cityName="Milano" onPress={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'map:locate' })).toBeNull();
  });

  it('con la posizione attiva il bottone centra la mappa su di te', async () => {
    const onLocate = jest.fn();
    await render(<MapSearchEntry cityName="Milano" onPress={jest.fn()} onLocate={onLocate} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:locate' }));
    expect(onLocate).toHaveBeenCalledTimes(1);
  });

  it('senza città scrive il suggerimento di ricerca', async () => {
    await render(<MapSearchEntry cityName={null} onPress={jest.fn()} />);
    expect(screen.getByText('map:searchPlaceholder')).toBeOnTheScreen();
  });
});
