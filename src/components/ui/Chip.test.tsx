import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors, radius } from '@/theme/tokens';

import { Chip } from './Chip';

describe('Chip', () => {
  it('segnala la selezione con una pill piena del colore del tono', async () => {
    await render(<Chip label="Milano" selected tone="going" onPress={jest.fn()} />);
    const chip = screen.getByRole('button', { name: 'Milano' });
    expect(chip).toBeSelected();
    expect(chip).toHaveStyle({
      borderColor: colors.going,
      backgroundColor: colors.going,
      borderRadius: radius.pill,
    });
  });

  it('usa il ciano per il tono "maybe" e il bordo neutro quando non selezionata', async () => {
    const { rerender } = await render(
      <Chip label="Club" selected tone="maybe" onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveStyle({
      borderColor: colors.maybe,
      backgroundColor: colors.maybe,
    });
    await rerender(<Chip label="Club" selected={false} tone="maybe" onPress={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveStyle({
      borderColor: colors.border,
      backgroundColor: colors.surface,
    });
    expect(screen.getByRole('button')).not.toBeSelected();
  });

  it('esegue l’azione al tocco', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Bar" selected={false} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Bar' }));
    expect(onPress).toHaveBeenCalled();
  });
});
