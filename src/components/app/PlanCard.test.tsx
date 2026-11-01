import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { EventRow } from './EventRow';
import { PlanCard } from './PlanCard';

describe('PlanCard', () => {
  it('mostra nome, prezzo e vantaggi e si seleziona', async () => {
    const onPress = jest.fn();
    await render(
      <PlanCard
        name="Base"
        priceLabel="9,99 €"
        perks={['a', 'b']}
        status="available"
        onPress={onPress}
      />,
    );
    expect(screen.getByText('Base')).toBeOnTheScreen();
    expect(screen.getByText('b')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Base, 9,99 €' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('evidenzia in ciano il piano selezionato', async () => {
    await render(<PlanCard name="Pro" priceLabel="p" status="selected" onPress={jest.fn()} />);
    expect(screen.getByRole('radio')).toBeChecked();
    expect(screen.getByTestId('plan-card')).toHaveStyle({ borderColor: colors.maybe });
  });

  it('mostra il badge Attivo o Annullato', async () => {
    const { rerender } = await render(<PlanCard name="Pro" priceLabel="p" status="active" />);
    expect(screen.getByText('ui:plan.active')).toBeOnTheScreen();
    await rerender(<PlanCard name="Pro" priceLabel="p" status="cancelled" />);
    expect(screen.getByText('ui:plan.cancelled')).toBeOnTheScreen();
    expect(screen.getByTestId('plan-card')).toHaveStyle({ borderColor: colors.border });
  });
});

describe('EventRow', () => {
  it('mostra serata, data, adesioni a fasce e target', async () => {
    await render(
      <EventRow
        name="Techno night"
        meta="Navigli Club"
        whenLabel="SAB 22:00"
        goingBand="30–50"
        maybeBand="pochi"
        targetLabel="18–24"
      />,
    );
    expect(screen.getByText('Techno night')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going 30–50')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybe ui:band.few')).toBeOnTheScreen();
    expect(screen.getByText('· 18–24')).toBeOnTheScreen();
  });
});
