import { render, screen } from '@testing-library/react-native';

import { AttendanceTiles } from './AttendanceTiles';

describe('AttendanceTiles', () => {
  it('mostra due riquadri con la fascia di "Ci vanno" e di "Forse"', async () => {
    await render(<AttendanceTiles going="20–30" maybe="3–10" />);
    expect(screen.getByText('venue:tiles.going')).toBeOnTheScreen();
    expect(screen.getByText('20–30')).toBeOnTheScreen();
    expect(screen.getByText('venue:tiles.maybe')).toBeOnTheScreen();
    expect(screen.getByText('3–10')).toBeOnTheScreen();
  });

  it('sotto la soglia mostra "pochi", mai una cifra', async () => {
    await render(<AttendanceTiles going="pochi" maybe="pochi" />);
    expect(screen.getAllByText('ui:band.few')).toHaveLength(2);
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it.each(['3–10', '10–20', '20–30', '30–50', '50–100', '100+'] as const)(
    'con la fascia %s non compare mai un numero esatto di persone',
    async (band) => {
      await render(<AttendanceTiles going={band} maybe="pochi" />);
      expect(screen.queryByText(/^\d+$/)).toBeNull();
      expect(screen.getByText(band)).toBeOnTheScreen();
    },
  );
});

describe('AttendanceTiles: presenze stimate', () => {
  it('con estimate mette STIMA su entrambi i riquadri; senza, su nessuno', async () => {
    const { rerender } = await render(<AttendanceTiles going="20–30" maybe="3–10" estimate />);
    expect(screen.getAllByText('ui:estimate.tag')).toHaveLength(2);
    await rerender(<AttendanceTiles going="20–30" maybe="3–10" />);
    expect(screen.queryByText('ui:estimate.tag')).not.toBeOnTheScreen();
  });
});
