import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { MapControls } from './MapControls';

const handlers = () => ({ onOpenFilters: jest.fn(), onExpand: jest.fn(), onLocate: jest.fn() });

describe('MapControls', () => {
  it('ha tre bottoni rotondi di 44 in colonna: filtri, schermo intero, posizione', async () => {
    await render(<MapControls {...handlers()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      'map:header.filters',
      'map:fullscreen.open',
      'map:locate',
    ]);
    for (const button of buttons) {
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        width: 44,
        height: 44,
        borderRadius: 999,
      });
    }
  });

  it('i bottoni stanno nello stesso contenitore, in colonna', async () => {
    await render(<MapControls {...handlers()} />);
    const column = screen.getByTestId('map-controls');
    expect(StyleSheet.flatten(column.props.style)).toMatchObject({ gap: 8 });
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('ogni bottone chiama il proprio handler', async () => {
    const h = handlers();
    await render(<MapControls {...h} />);
    await fireEvent.press(screen.getByRole('button', { name: 'map:header.filters' }));
    await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.open' }));
    await fireEvent.press(screen.getByRole('button', { name: 'map:locate' }));
    expect(h.onOpenFilters).toHaveBeenCalledTimes(1);
    expect(h.onExpand).toHaveBeenCalledTimes(1);
    expect(h.onLocate).toHaveBeenCalledTimes(1);
  });
});
