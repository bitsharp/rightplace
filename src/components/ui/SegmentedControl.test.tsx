import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/tokens';

import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'going', label: 'ui:intent.goingAction', tone: 'going' },
  { value: 'maybe', label: 'ui:intent.maybeAction', tone: 'maybe' },
  { value: 'all', label: 'venue:all', tone: 'neutral' },
] as const;

describe('SegmentedControl', () => {
  it('mostra tutte le voci e marca quella attiva', async () => {
    await render(<SegmentedControl options={OPTIONS} value="maybe" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'ui:intent.goingAction' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'ui:intent.maybeAction' })).toBeSelected();
  });

  it('colora la voce attiva con il suo tono: viola, ciano o bianco', async () => {
    const { rerender } = await render(
      <SegmentedControl options={OPTIONS} value="going" onChange={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'ui:intent.goingAction' })).toHaveStyle({
      backgroundColor: colors.going,
    });
    await rerender(<SegmentedControl options={OPTIONS} value="maybe" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'ui:intent.maybeAction' })).toHaveStyle({
      backgroundColor: colors.maybe,
    });
    await rerender(<SegmentedControl options={OPTIONS} value="all" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'venue:all' })).toHaveStyle({
      backgroundColor: colors.text,
    });
  });

  it('notifica la nuova voce con un feedback aptico', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={OPTIONS} value="going" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:all' }));
    expect(onChange).toHaveBeenCalledWith('all');
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('non notifica nulla se si tocca la voce già attiva', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={OPTIONS} value="going" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'ui:intent.goingAction' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
