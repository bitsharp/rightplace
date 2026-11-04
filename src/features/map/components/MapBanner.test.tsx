import { render, screen } from '@testing-library/react-native';

import { MapBanner } from './MapBanner';

describe('MapBanner', () => {
  it('"solo di solito": spiega che i punti grigi sono l’affluenza abituale', async () => {
    await render(<MapBanner kind="typicalOnly" />);
    expect(screen.getByText('map:banner.typicalOnly')).toBeOnTheScreen();
  });

  it('stato vuoto vero: serata tranquilla', async () => {
    await render(<MapBanner kind="empty" />);
    expect(screen.getByText('map:banner.empty')).toBeOnTheScreen();
    expect(screen.queryByText('map:banner.typicalOnly')).not.toBeOnTheScreen();
  });

  it('con punti caldi non mostra nulla', async () => {
    await render(<MapBanner kind="none" />);
    expect(screen.queryByText(/map:banner/)).not.toBeOnTheScreen();
  });
});
