import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TransportLink } from '../domain/transport';
import { GettingThere } from './GettingThere';

const taxi: TransportLink = { provider: 'taxi', primaryUrl: 'tel:+39028585' };
const uber: TransportLink = { provider: 'uber', primaryUrl: 'https://m.uber.com/ul/' };
const transit: TransportLink = { provider: 'transit', primaryUrl: 'https://maps' };

const props = {
  venueName: 'Arena Club',
  cityName: 'Milano',
  taxiNumber: '+39 02 8585',
  direction: 'there' as const,
  onDirection: jest.fn(),
  onOpen: jest.fn(),
};

describe('GettingThere', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra una riga per ogni servizio con badge e azione', async () => {
    await render(<GettingThere {...props} links={[taxi, uber, transit]} />);
    expect(screen.getByText('venue:transport.badge.taxi')).toBeOnTheScreen();
    expect(screen.getByText('venue:transport.badge.uber')).toBeOnTheScreen();
    expect(screen.getByText('venue:transport.badge.transit')).toBeOnTheScreen();
    expect(screen.getAllByText('venue:transport.action.open')).toHaveLength(2);
    expect(screen.getByText('venue:transport.action.call')).toBeOnTheScreen();
  });

  it('il taxi mostra il numero della città', async () => {
    await render(<GettingThere {...props} links={[taxi]} />);
    expect(screen.getByText('+39 02 8585')).toBeOnTheScreen();
  });

  it('senza link taxi non c’è nessuna riga taxi', async () => {
    await render(<GettingThere {...props} taxiNumber={null} links={[uber, transit]} />);
    expect(screen.queryByText('venue:transport.badge.taxi')).toBeNull();
  });

  it('il dettaglio dipende dalla direzione', async () => {
    const { rerender } = await render(<GettingThere {...props} links={[uber]} />);
    expect(
      screen.getByText('venue:transport.detail.uber.there({"venue":"Arena Club"})'),
    ).toBeOnTheScreen();
    await rerender(<GettingThere {...props} direction="back" links={[uber]} />);
    expect(
      screen.getByText('venue:transport.detail.uber.back({"venue":"Arena Club"})'),
    ).toBeOnTheScreen();
  });

  it('toccando una riga apre quel link', async () => {
    await render(<GettingThere {...props} links={[taxi, uber]} />);
    await fireEvent.press(screen.getByText('venue:transport.badge.uber'));
    expect(props.onOpen).toHaveBeenCalledWith(uber);
  });

  it('cambia direzione da Per andare / Per tornare', async () => {
    await render(<GettingThere {...props} links={[uber]} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:transport.back' }));
    expect(props.onDirection).toHaveBeenCalledWith('back');
  });

  it('avvisa che i link aprono le app reali', async () => {
    await render(<GettingThere {...props} links={[uber]} />);
    expect(screen.getByText('venue:transport.note')).toBeOnTheScreen();
  });
});
