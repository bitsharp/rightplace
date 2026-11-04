import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { TypicalDot } from './TypicalDot';

const dot = () => screen.getByTestId('typical-dot', { includeHiddenElements: true });

describe('TypicalDot', () => {
  it('ha una taglia diversa per ognuno dei tre livelli, in ordine crescente', async () => {
    const widths: number[] = [];
    for (const level of [1, 2, 3] as const) {
      const { unmount } = await render(
        <TypicalDot venueName="Arena" level={level} onPress={jest.fn()} />,
      );
      widths.push(Number(StyleSheet.flatten(dot().props.style).width));
      await unmount();
    }
    expect(widths[0]).toBeLessThan(widths[1] ?? 0);
    expect(widths[1]).toBeLessThan(widths[2] ?? 0);
  });

  it('è un cerchio grigio semitrasparente, mai viola o ciano', async () => {
    await render(<TypicalDot venueName="Arena" level={2} onPress={jest.fn()} />);
    expect(dot()).toHaveStyle({ backgroundColor: colors.typicalDot, opacity: 0.6 });
  });

  it('non scrive nessuna label né numero', async () => {
    await render(<TypicalDot venueName="Arena" level={3} onPress={jest.fn()} />);
    expect(screen.queryByText(/./, { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('è un bottone accessibile che dice il livello a parole e apre il locale', async () => {
    const onPress = jest.fn();
    await render(<TypicalDot venueName="Arena" level={2} onPress={onPress} />);
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'ui:typical.a11y({"venue":"Arena","level":"ui:typical.lively"})',
      }),
    );
    expect(onPress).toHaveBeenCalled();
  });

  it('ha un’area di tocco di almeno 44 punti anche con il punto più piccolo', async () => {
    await render(<TypicalDot venueName="Arena" level={1} onPress={jest.fn()} />);
    const { width, height } = StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
});
