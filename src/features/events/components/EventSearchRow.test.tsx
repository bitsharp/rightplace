import { fireEvent, render, screen } from '@testing-library/react-native';

import { EventSearchRow } from './EventSearchRow';

const props = {
  name: 'Notte Techno',
  venueName: 'Arena Club',
  whenLabel: 'Stasera · 22:00',
  goingBand: '3–10' as const,
  maybeBand: 'pochi' as const,
};

describe('EventSearchRow', () => {
  it('mostra il badge data/ora, il nome, il locale e le fasce', async () => {
    await render(<EventSearchRow {...props} onPress={jest.fn()} />);
    expect(screen.getByText('Stasera · 22:00')).toBeOnTheScreen();
    expect(screen.getByText('Notte Techno')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going 3–10')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybe ui:band.few')).toBeOnTheScreen();
  });

  it('il tap apre la serata', async () => {
    const onPress = jest.fn();
    await render(<EventSearchRow {...props} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Notte Techno, Arena Club' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('una serata sponsorizzata è sempre etichettata', async () => {
    await render(<EventSearchRow {...props} sponsored onPress={jest.fn()} />);
    expect(screen.getByText('ui:labels.sponsored')).toBeOnTheScreen();
  });
});
