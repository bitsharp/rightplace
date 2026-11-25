import { fireEvent, render, screen } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { MapSearchEntry } from './MapSearchEntry';

describe('MapSearchEntry', () => {
  it('mostra la città e apre la ricerca', async () => {
    const onPress = jest.fn();
    await render(<MapSearchEntry cityName="Milano" onPress={onPress} onLocate={jest.fn()} />);
    expect(screen.getByText('Milano')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'map:searchPlaceholder' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('l’icona a sinistra è un bottone separato, alto almeno 44, che non apre la ricerca', async () => {
    const onPress = jest.fn();
    const onLocate = jest.fn();
    await render(<MapSearchEntry cityName="Milano" onPress={onPress} onLocate={onLocate} />);
    const locate = screen.getByRole('button', { name: 'map:locate' });
    expect(StyleSheet.flatten(locate.props.style)).toMatchObject({ width: 44, height: 44 });
    await fireEvent.press(locate);
    expect(onLocate).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('il bottone di localizzazione sta a sinistra, prima del campo di ricerca', async () => {
    await render(<MapSearchEntry cityName="Milano" onPress={jest.fn()} onLocate={jest.fn()} />);
    const [first] = screen.getAllByRole('button');
    expect(first?.props.accessibilityLabel).toBe('map:locate');
  });

  it('il resto della barra apre la ricerca e non centra la mappa', async () => {
    const onPress = jest.fn();
    const onLocate = jest.fn();
    await render(<MapSearchEntry cityName="Milano" onPress={onPress} onLocate={onLocate} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:searchPlaceholder' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLocate).not.toHaveBeenCalled();
  });

  it('senza città scrive il suggerimento di ricerca', async () => {
    await render(<MapSearchEntry cityName={null} onPress={jest.fn()} onLocate={jest.fn()} />);
    expect(screen.getByText('map:searchPlaceholder')).toBeOnTheScreen();
  });
});
