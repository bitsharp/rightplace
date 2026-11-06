import { fireEvent, render, screen } from '@testing-library/react-native';

import { EventRow } from './EventRow';

const baseProps = {
  name: 'Notte Techno',
  meta: 'Arena Club · Club',
  whenLabel: 'Sab 14 · 22:00',
  goingBand: '30–50' as const,
  maybeBand: 'pochi' as const,
  targetLabel: '18–24 · Tutti',
};

describe('EventRow', () => {
  it('mostra nome, locale, quando, fasce SI/FORSE e target: mai persone', async () => {
    await render(<EventRow {...baseProps} />);
    expect(screen.getByText('Notte Techno')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club · Club')).toBeOnTheScreen();
    expect(screen.getByText('Sab 14 · 22:00')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going 30–50')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybe ui:band.few')).toBeOnTheScreen();
    expect(screen.getByText('· 18–24 · Tutti')).toBeOnTheScreen();
  });

  it('una serata annullata ha il badge ANNULLATA', async () => {
    await render(<EventRow {...baseProps} cancelled />);
    expect(screen.getByText('ui:event.cancelled')).toBeOnTheScreen();
  });

  it('una serata attiva non ha il badge', async () => {
    await render(<EventRow {...baseProps} />);
    expect(screen.queryByText('ui:event.cancelled')).toBeNull();
  });

  it('con onPress è un bottone che apre il dettaglio', async () => {
    const onPress = jest.fn();
    await render(<EventRow {...baseProps} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Notte Techno' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('senza onPress non è un bottone', async () => {
    await render(<EventRow {...baseProps} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
