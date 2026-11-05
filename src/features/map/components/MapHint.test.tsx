import { render, screen } from '@testing-library/react-native';

import { MapHint } from './MapHint';

describe('MapHint', () => {
  it('nella mappa generale invita a toccare un punto caldo', async () => {
    await render(<MapHint view="general" />);
    expect(screen.getByText('map:hint.general')).toBeOnTheScreen();
  });

  it('nella mappa amici dice dove vanno gli amici', async () => {
    await render(<MapHint view="friends" />);
    expect(screen.getByText('map:hint.friends')).toBeOnTheScreen();
  });

  it('va a capo su due righe invece di uscire dallo schermo', async () => {
    await render(<MapHint view="general" />);
    expect(screen.getByText('map:hint.general').props.numberOfLines).toBe(2);
  });
});
