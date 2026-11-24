import { fireEvent, render, screen } from '@testing-library/react-native';

import { MapHeader } from './MapHeader';

describe('MapHeader', () => {
  it('scrive il titolo con la città in viola e il sottotitolo', async () => {
    await render(<MapHeader cityName="Milano" onOpenFilters={jest.fn()} />);
    expect(screen.getByText(/map:header\.title/)).toBeOnTheScreen();
    expect(screen.getByText('map:header.subtitle')).toBeOnTheScreen();
  });

  it('colora solo la città', async () => {
    await render(<MapHeader cityName="Milano" onOpenFilters={jest.fn()} />);
    expect(screen.getByTestId('map-title-city')).toHaveTextContent('Milano');
  });

  it('senza città scrive comunque il titolo, senza parte viola', async () => {
    await render(<MapHeader cityName={null} onOpenFilters={jest.fn()} />);
    expect(screen.getByText('map:header.titleNoCity')).toBeOnTheScreen();
    expect(screen.queryByTestId('map-title-city')).toBeNull();
  });

  it('l’icona dei filtri apre la ricerca (la mappa non ha filtri propri)', async () => {
    const onOpenFilters = jest.fn();
    await render(<MapHeader cityName="Milano" onOpenFilters={onOpenFilters} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:header.filters' }));
    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });
});
