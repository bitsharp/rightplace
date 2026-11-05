import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { MapLegend } from './MapLegend';

describe('MapLegend', () => {
  it('ha due righe separate: STASERA (SI, FORSE, Tu) e DI SOLITO', async () => {
    await render(<MapLegend />);
    expect(screen.getByText('map:legend.tonight')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybe')).toBeOnTheScreen();
    expect(screen.getByText('ui:you')).toBeOnTheScreen();
    expect(screen.getByText('map:legend.usually')).toBeOnTheScreen();
  });

  it('descrive lo strato grigio a parole: tranquillo · animato · pieno', async () => {
    await render(<MapLegend />);
    expect(screen.getByText('ui:typical.quiet')).toBeOnTheScreen();
    expect(screen.getByText('ui:typical.lively')).toBeOnTheScreen();
    expect(screen.getByText('ui:typical.packed')).toBeOnTheScreen();
  });

  it('disegna tre pallini grigi crescenti per "di solito"', async () => {
    await render(<MapLegend />);
    const dots = screen.getAllByTestId('legend-typical-dot');
    expect(dots).toHaveLength(3);
  });

  it('non attribuisce lo strato grigio a Google', async () => {
    await render(<MapLegend />);
    expect(screen.queryByText(/google/i)).not.toBeOnTheScreen();
  });

  it('manda a capo gli elementi invece di sbordare a destra', async () => {
    await render(<MapLegend />);
    for (const row of screen.getAllByTestId('legend-items')) {
      expect(StyleSheet.flatten(row.props.style).flexWrap).toBe('wrap');
    }
    expect(screen.getAllByTestId('legend-items')).toHaveLength(2);
  });

  it('ogni blocco ha l’etichetta su una riga propria, senza larghezza fissa', async () => {
    await render(<MapLegend />);
    for (const key of ['map:legend.tonight', 'map:legend.usually']) {
      const label = screen.getByText(key);
      expect(label.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(label.props.style).width).toBeUndefined();
      expect(StyleSheet.flatten(label.parent?.props.style).width).toBeUndefined();
    }
    for (const row of screen.getAllByTestId('legend-items')) {
      expect(StyleSheet.flatten(row.props.style).width).toBeUndefined();
    }
  });

  it('il riquadro si estende a tutta la larghezza disponibile e i blocchi stanno uno sotto l’altro', async () => {
    await render(<MapLegend />);
    const box = StyleSheet.flatten(screen.getByTestId('map-legend').props.style);
    expect(box.alignSelf).toBe('stretch');
    expect(box.flexDirection ?? 'column').toBe('column');
  });

  it('ogni elemento è pallino e testo sulla stessa riga, su una riga sola', async () => {
    await render(<MapLegend />);
    for (const key of ['ui:intent.going', 'ui:you', 'ui:typical.packed']) {
      const text = screen.getByText(key);
      expect(text.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(text.parent?.props.style).flexDirection).toBe('row');
    }
  });
});
