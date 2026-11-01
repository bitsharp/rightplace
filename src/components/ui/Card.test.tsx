import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { Card } from './Card';
import { Divider } from './Divider';
import { EmptyState } from './EmptyState';

describe('Card', () => {
  it('è una superficie con bordo e raggio 16', async () => {
    await render(
      <Card testID="card">
        <Text>contenuto</Text>
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.card,
    });
    expect(screen.getByText('contenuto')).toBeOnTheScreen();
  });

  it('evidenzia il bordo nel tono "going"', async () => {
    await render(<Card testID="card" tone="going" />);
    expect(screen.getByTestId('card')).toHaveStyle({ borderColor: colors.goingBorder });
  });
});

describe('Divider', () => {
  it('è una linea sottile del colore dei bordi', async () => {
    await render(<Divider />);
    expect(screen.getByTestId('divider')).toHaveStyle({ backgroundColor: colors.border });
  });
});

describe('EmptyState', () => {
  it('mostra il messaggio in un riquadro tratteggiato', async () => {
    await render(<EmptyState message="venue:fewerThanThree" />);
    expect(screen.getByText('venue:fewerThanThree')).toBeOnTheScreen();
    expect(screen.getByTestId('empty-state')).toHaveStyle({ borderStyle: 'dashed' });
  });
});
