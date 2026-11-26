import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { MapLegend } from './MapLegend';

describe('MapLegend', () => {
  it('ha un solo blocco, STASERA (SI, FORSE, Tu), senza lo strato grigio "di solito"', async () => {
    await render(<MapLegend />);
    expect(screen.getByText('map:legend.tonight')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybe')).toBeOnTheScreen();
    expect(screen.getByText('ui:you')).toBeOnTheScreen();
    expect(screen.queryByText('map:legend.usually')).toBeNull();
  });

  it('nello strato "stasera" c’è anche la voce Serata, col pallino tratteggiato', async () => {
    await render(<MapLegend />);
    expect(screen.getByText('map:legend.event')).toBeOnTheScreen();
    const dot = StyleSheet.flatten(screen.getByTestId('legend-event-dot').props.style);
    expect(dot.borderStyle).toBe('dashed');
  });

  it('nello strato "stasera" c’è la voce Spot: ciano, quadrato arrotondato, non un cerchio', async () => {
    await render(<MapLegend />);
    expect(screen.getByText('map:legend.spot')).toBeOnTheScreen();
    const dot = StyleSheet.flatten(screen.getByTestId('legend-spot-dot').props.style);
    expect(dot.backgroundColor).toBe(colors.maybe);
    expect(dot.borderRadius).not.toBe(999);
  });

  it('contiene solo titoli e voci con simbolo: niente righe di spiegazione', async () => {
    await render(<MapLegend />);
    expect(screen.queryByText('map:legend.estimate')).toBeNull();
    expect(screen.queryByText('map:legend.brightness')).toBeNull();
    expect(screen.getAllByTestId('legend-items')).toHaveLength(1);
  });

  it('non descrive né disegna lo strato grigio: niente tranquillo · animato · pieno, niente pallini grigi', async () => {
    await render(<MapLegend />);
    expect(screen.queryByText('ui:typical.quiet')).toBeNull();
    expect(screen.queryByText('ui:typical.lively')).toBeNull();
    expect(screen.queryByText('ui:typical.packed')).toBeNull();
    expect(screen.queryAllByTestId('legend-typical-dot')).toHaveLength(0);
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
    expect(screen.getAllByTestId('legend-items')).toHaveLength(1);
  });

  it('ogni blocco ha l’etichetta su una riga propria, senza larghezza fissa', async () => {
    await render(<MapLegend />);
    for (const key of ['map:legend.tonight']) {
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
    for (const key of ['ui:intent.going', 'ui:you']) {
      const text = screen.getByText(key);
      expect(text.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(text.parent?.props.style).flexDirection).toBe('row');
    }
  });
});
