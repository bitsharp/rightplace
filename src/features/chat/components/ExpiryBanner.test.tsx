import { render, screen } from '@testing-library/react-native';

import { ExpiryBanner } from './ExpiryBanner';

describe('ExpiryBanner', () => {
  it('spiega sempre che la chat si cancella da sola', async () => {
    await render(<ExpiryBanner hours={null} />);
    expect(screen.getByText('chat:info')).toBeOnTheScreen();
    expect(screen.queryByText(/chat:expiresIn/)).toBeNull();
  });

  it('con meno di 12 ore avvisa quante ne restano', async () => {
    await render(<ExpiryBanner hours={3} />);
    expect(screen.getByText('chat:expiresIn({"count":3})')).toBeOnTheScreen();
  });
});
