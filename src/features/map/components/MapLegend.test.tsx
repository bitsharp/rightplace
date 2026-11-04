import { render, screen } from '@testing-library/react-native';

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
});
