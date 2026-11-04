import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeclarationPill } from './DeclarationPill';

const declaration = {
  venueId: 'v1',
  venueName: 'Arena Club',
  intent: 'going' as const,
  expiresAt: '2026-11-05T05:00:00Z',
};

describe('DeclarationPill', () => {
  it('senza dichiarazione non c’è', async () => {
    await render(<DeclarationPill declaration={null} onPress={jest.fn()} />);
    expect(screen.queryByText(/map:pill/)).not.toBeOnTheScreen();
  });

  it('con "Ci vado" mostra locale e intenzione e apre il locale', async () => {
    const onPress = jest.fn();
    await render(<DeclarationPill declaration={declaration} onPress={onPress} />);
    await fireEvent.press(
      screen.getByText('map:pill.text({"venue":"Arena Club","intent":"ui:intent.goingAction"})'),
    );
    expect(onPress).toHaveBeenCalledWith('v1');
  });

  it('con "Forse" usa l’etichetta del Forse', async () => {
    await render(
      <DeclarationPill declaration={{ ...declaration, intent: 'maybe' }} onPress={jest.fn()} />,
    );
    expect(
      screen.getByText('map:pill.text({"venue":"Arena Club","intent":"ui:intent.maybeAction"})'),
    ).toBeOnTheScreen();
  });
});
