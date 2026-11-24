import { render, screen } from '@testing-library/react-native';

import { OpenStatusLine } from './OpenStatusLine';

describe('OpenStatusLine', () => {
  it('aperto con orario di chiusura', async () => {
    await render(<OpenStatusLine status={{ kind: 'open', closesAt: '04:00' }} />);
    expect(screen.getByText('venue:status.open({"time":"04:00"})')).toBeOnTheScreen();
  });

  it('aperto 24 ore: solo "Aperto"', async () => {
    await render(<OpenStatusLine status={{ kind: 'open', closesAt: null }} />);
    expect(screen.getByText('venue:status.openNoClose')).toBeOnTheScreen();
  });

  it('chiuso', async () => {
    await render(<OpenStatusLine status={{ kind: 'closed' }} />);
    expect(screen.getByText('venue:status.closed')).toBeOnTheScreen();
  });

  it('senza orari noti non mostra nulla', async () => {
    await render(<OpenStatusLine status={null} />);
    expect(screen.queryByText(/venue:status/)).toBeNull();
  });
});
